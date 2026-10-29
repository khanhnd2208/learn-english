import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_HINT_MAX_BOX, EN_DAILY_DUE_LIMIT, EN_NEW_WORDS_DEFAULT, EN_ROUND_REVIEW_LIMIT, EN_TX_MAX_WAIT_MS, EN_TX_TIMEOUT_MS, EN_WEEKLY_DAYS_DEFAULT } from '@/lib/english/constants';
import { buildDailyQueue, intervalChange, isLongTerm, isNearMiss, scheduleMove, vnDayStart, type ScheduledState } from '@/lib/english/schedule';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { shiftVnDay, vnDayKey, vnWeekDays } from '@/lib/english/gapRule';
import { streakStats } from '@/lib/english/streak';
import { pacedEnough, reviewXpEvents } from '@/lib/english/xp';
import { type SenseBundle } from '@/lib/english/senseBundle';
import { getSenseBundles } from '@/services/english/enContentService';
import { answerLayout, type AnswerLayout } from '@/lib/english/answerLayout';
import { hintFor } from '@/lib/english/srsPrompt';
import { normalizeLearnerText } from '@/lib/english/text';

export type DailyItem = { senseId: string; kind: 'review' | 'new'; box: number; hint: { firstLetter: string; letterCount: number } | null; layout: AnswerLayout; bundle: SenseBundle };

export type DailyAnswerResult = {
	result: 'correct' | 'wrong' | 'near' | 'synonym';
	expected: string;
	boxBefore: number;
	boxAfter: number;
	/** False when the answer came before the word was due, so the schedule did not move. */
	scheduled: boolean;
	nextDueAt: string | null;
	fromDays: number;
	toDays: number;
	/** XP this answer earned. */
	xp: number;
	/** Saved review row; a wrong typed answer can be appealed with it. */
	reviewId?: string;
};

export type TodayOverview = {
	dueTotal: number;
	dueCount: number;
	newCount: number;
	introducedToday: number;
	enrolledSets: number;
	tomorrowCount: number;
	longTermCount: number;
	learnedCount: number;
	week: Array<{ day: string; studied: boolean; isToday: boolean; isFuture: boolean }>;
	weeklyGoal: number;
	recentLapses: Array<{ senseId: string; lemma: string; meaningVi: string }>;
	reviewedToday: number;
	practicedToday: number;
	practiceAvailable: number;
	streakDays: number;
	longestStreak: number;
	/** Due words the learner has forgotten before. */
	lapsedDue: number;
	/** Words in box 2 or 3, which can reach long-term soon. */
	rememberingCount: number;
	dueNext7Days: Array<{ day: string; count: number }>;
	accuracy30: number | null;
};

const SCHEDULED_SELECT = { id: true, senseId: true, box: true, dueAt: true, lapses: true, introducedAt: true, lastReviewedAt: true } as const;

/** Only scheduled words in a currently downloaded, published set. */
async function scheduledStates(userId: string): Promise<ScheduledState[]> {
	return prisma.enWordState.findMany({
		where: { userId, box: { gt: 0 }, sense: { status: 'published', setItems: { some: { set: { status: 'published', enrollments: { some: { userId } } } } } } },
		select: SCHEDULED_SELECT,
	});
}

async function newWordPool(userId: string): Promise<{ pool: string[]; enrolledSets: number }> {
	const enrollments = await prisma.enEnrollment.findMany({
		where: { userId, set: { status: 'published' } },
		orderBy: { createdAt: 'asc' },
		select: { setId: true },
	});
	const setIds = enrollments.map(({ setId }) => setId);
	if (!setIds.length) return { pool: [], enrolledSets: 0 };
	const items = await prisma.enSetItem.findMany({
		where: { setId: { in: setIds }, sense: { status: 'published' } },
		orderBy: [{ set: { sortOrder: 'asc' } }, { position: 'asc' }],
		select: { senseId: true },
	});
	return { pool: [...new Set(items.flatMap(({ senseId }) => senseId ? [senseId] : []))], enrolledSets: setIds.length };
}

function countIntroducedToday(states: ScheduledState[], now: Date): number {
	const start = vnDayStart(vnDayKey(now)).getTime();
	return states.filter((state) => state.introducedAt.getTime() >= start).length;
}

async function planToday(userId: string, now: Date) {
	const [states, { pool, enrolledSets }] = await Promise.all([scheduledStates(userId), newWordPool(userId)]);
	const introducedToday = countIntroducedToday(states, now);
	const queue = buildDailyQueue(states, pool, {
		now,
		newWordsPerDay: EN_NEW_WORDS_DEFAULT,
		introducedToday,
		dueBacklogLimit: EN_DAILY_DUE_LIMIT,
		dueLimit: EN_ROUND_REVIEW_LIMIT,
	});
	const dueTotal = states.filter((state) => state.dueAt <= now).length;
	return { states, queue, dueTotal, introducedToday, enrolledSets };
}

export async function startToday(userId: string, now = new Date()) {
	const plan = await planToday(userId, now);
	const { dueTotal } = plan;
	const queue = plan.queue;
	const senseIds = queue.map((item) => item.kind === 'new' ? item.senseId : item.state.senseId);
	if (!senseIds.length) return { sessionId: null, dueCount: 0, newCount: 0, dueTotal, items: [] as DailyItem[] };
	const session = await prisma.enPracticeSession.create({
		data: { userId, mode: 'review', activityKey: 'srs_type', senseIds, startedAt: now },
	});
	const bundles = await getSenseBundles(senseIds, true);
	const bySense = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
	const items = queue.flatMap((item): DailyItem[] => {
		const senseId = item.kind === 'new' ? item.senseId : item.state.senseId;
		const bundle = bySense.get(senseId);
		const box = item.kind === 'new' ? 0 : item.state.box;
		return bundle ? [{ senseId, kind: item.kind, box, hint: box <= EN_HINT_MAX_BOX ? hintFor(bundle.word.lemma) : null, bundle, layout: answerLayout(bundle.word.lemma) }] : [];
	});
	return {
		sessionId: session.id,
		dueCount: items.filter((item) => item.kind === 'review').length,
		newCount: items.filter((item) => item.kind === 'new').length,
		dueTotal,
		items,
	};
}

async function studiedDays(userId: string, from: Date): Promise<Set<string>> {
	const [rows, guided] = await Promise.all([
		prisma.enReview.findMany({ where: { userId, at: { gte: from } }, select: { at: true } }),
		prisma.enGuidedReviewQuestion.findMany({ where: { kind: 'main', answeredAt: { gte: from }, session: { userId } }, select: { answeredAt: true } }),
	]);
	return new Set([...rows.map((row) => vnDayKey(row.at)), ...guided.flatMap((row) => row.answeredAt ? [vnDayKey(row.answeredAt)] : [])]);
}

/** Cached per request: the app layout and the page both read it. */
export const getTodayOverview = cache(async (userId: string, now = new Date()): Promise<TodayOverview> => {
	const { states, queue, dueTotal, introducedToday, enrolledSets } = await planToday(userId, now);
	const today = vnDayKey(now);
	const tomorrowEnd = vnDayStart(shiftVnDay(today, 2));
	const days = vnWeekDays(today);
	const [studied, profile, recentReviews, guidedToday, practiceItems] = await Promise.all([
		studiedDays(userId, vnDayStart(shiftVnDay(today, -365))),
		prisma.enLearnerProfile.findUnique({ where: { userId }, select: { weeklyDaysGoal: true } }),
		prisma.enReview.findMany({ where: { userId, at: { gte: vnDayStart(shiftVnDay(today, -29)) } }, select: { at: true, correct: true, scheduled: true, boxBefore: true } }),
		prisma.enGuidedReviewQuestion.count({ where: { kind: 'main', answeredAt: { gte: vnDayStart(today) }, session: { userId } } }),
		prisma.enSetItem.findMany({ where: { set: { status: 'published', enrollments: { some: { userId } } }, sense: { status: 'published' } }, select: { senseId: true } }),
	]);
	const lapsed = states
		.filter((state) => state.lapses > 0 && state.box <= 2)
		.sort((a, b) => b.lapses - a.lapses || (b.lastReviewedAt?.getTime() ?? 0) - (a.lastReviewedAt?.getTime() ?? 0))
		.slice(0, 6);
	const lapsedBundles = await getSenseBundles(lapsed.map((state) => state.senseId), true);
	const streak = streakStats(studied, today);
	const scheduled = recentReviews.filter((row) => row.scheduled && row.boxBefore > 0);
	return {
		reviewedToday: recentReviews.filter((row) => vnDayKey(row.at) === today).length,
		practicedToday: guidedToday,
		practiceAvailable: new Set(practiceItems.flatMap((item) => item.senseId ? [item.senseId] : [])).size,
		streakDays: streak.current,
		longestStreak: streak.longest,
		lapsedDue: states.filter((state) => state.lapses > 0 && state.dueAt <= now).length,
		rememberingCount: states.filter((state) => state.box >= 2 && !isLongTerm(state.box)).length,
		accuracy30: scheduled.length ? scheduled.filter((row) => row.correct).length / scheduled.length : null,
		dueNext7Days: Array.from({ length: 7 }, (_, offset) => {
			const day = shiftVnDay(today, offset);
			const start = vnDayStart(day);
			const end = vnDayStart(shiftVnDay(day, 1));
			return { day, count: states.filter((state) => offset === 0 ? state.dueAt < end : state.dueAt >= start && state.dueAt < end).length };
		}),
		dueTotal,
		dueCount: queue.filter((item) => item.kind === 'review').length,
		newCount: queue.filter((item) => item.kind === 'new').length,
		introducedToday,
		enrolledSets,
		tomorrowCount: states.filter((state) => state.dueAt > now && state.dueAt < tomorrowEnd).length,
		longTermCount: states.filter((state) => isLongTerm(state.box)).length,
		learnedCount: states.length,
		week: days.map((day) => ({ day, studied: studied.has(day), isToday: day === today, isFuture: day > today })),
		weeklyGoal: profile?.weeklyDaysGoal ?? EN_WEEKLY_DAYS_DEFAULT,
		recentLapses: lapsedBundles.map((bundle) => ({ senseId: bundle.sense.id, lemma: bundle.word.lemma, meaningVi: bundle.sense.meaningVi })),
	};
});

function acceptedAnswers(bundle: SenseBundle): string[] { return bundle.word.forms; }

export async function answerToday(
	userId: string,
	input: { sessionId: string; senseId: string; answer: string; responseMs?: number; giveUp?: boolean; typoChecked?: boolean },
	now = new Date(),
): Promise<DailyAnswerResult> {
	const session = await prisma.enPracticeSession.findFirst({ where: { id: input.sessionId, userId, mode: 'review' } });
	if (!session) throw new AppError('Không tìm thấy phiên học hôm nay', 404);
	if (session.endedAt) throw new AppError('Phiên học đã kết thúc', 409);
	if (!(session.senseIds ?? []).includes(input.senseId)) throw new AppError('Từ không thuộc phiên học này', 400);
	const bundle = (await getSenseBundles([input.senseId], true))[0];
	if (!bundle) throw new AppError('Không tìm thấy từ', 404);
	const expected = bundle.word.lemma;
	const accepted = acceptedAnswers(bundle);
	const correct = !input.giveUp && gradeEnglishAnswer({ skill: 'sound', answer: input.answer, expected, acceptedAnswers: accepted, audioOpened: false, skipped: false }).displayCorrect;
	const state = await prisma.enWordState.findUnique({ where: { userId_senseId: { userId, senseId: input.senseId } } });
	const before = state?.box ?? 0;
	if (!correct && !input.giveUp && bundle.sense.synonyms.some((synonym) => normalizeLearnerText(synonym) === normalizeLearnerText(input.answer))) {
		return { result: 'synonym', expected: '', boxBefore: before, boxAfter: before, scheduled: false, nextDueAt: state?.dueAt.toISOString() ?? null, ...intervalChange(before, before), xp: 0 };
	}
	if (!correct && !input.giveUp && !input.typoChecked && isNearMiss(input.answer, [expected, ...accepted])) {
		return { result: 'near', expected: '', boxBefore: before, boxAfter: before, scheduled: false, nextDueAt: state?.dueAt.toISOString() ?? null, ...intervalChange(before, before), xp: 0 };
	}
	const responseMs = Math.max(0, Math.min(120_000, Math.trunc(input.responseMs ?? 0)));
	const next = scheduleMove(state, correct, now);
	const changed = next.scheduled;
	const nextDue = next.dueAt;
	let xp = 0;
	let reviewId = '';
	await prisma.$transaction(async (tx) => {
		if (changed) {
			const schedule = { box: next.box, lapses: next.lapses, dueAt: nextDue, lastReviewedAt: now };
			await tx.enWordState.upsert({
				where: { userId_senseId: { userId, senseId: input.senseId } },
				create: { userId, senseId: input.senseId, introducedAt: now, ...schedule },
				update: { ...schedule, ...(before === 0 ? { introducedAt: now } : {}) },
			});
		}
		const last = await tx.enReview.findFirst({ where: { sessionId: session.id }, orderBy: { at: 'desc' }, select: { at: true } });
			const paced = pacedEnough(last?.at ?? session.startedAt, now);
			const review = await tx.enReview.create({ data: { sessionId: session.id, userId, senseId: input.senseId, at: now, prompt: before <= EN_HINT_MAX_BOX ? 'hinted' : 'free', correct, responseMs, boxBefore: before, boxAfter: next.box, scheduled: changed } });
		reviewId = review.id;
		const day = vnDayKey(now);
		const extraToday = !changed && correct
			? (await tx.enXpEvent.aggregate({ where: { userId, day, kind: 'extra' }, _sum: { xp: true } }))._sum.xp ?? 0
			: 0;
		const events = reviewXpEvents(review, extraToday, paced);
		if (events.length) {
			const created = await tx.enXpEvent.createManyAndReturn({ data: events.map((event) => ({ ...event, userId, day, at: now })), skipDuplicates: true, select: { xp: true } });
			xp = created.reduce((sum, row) => sum + row.xp, 0);
		}
	}, { timeout: EN_TX_TIMEOUT_MS, maxWait: EN_TX_MAX_WAIT_MS });
	return { result: correct ? 'correct' : 'wrong', expected, boxBefore: before, boxAfter: next.box, scheduled: changed, nextDueAt: nextDue.toISOString(), ...intervalChange(before, next.box), xp, reviewId };
}

export async function finishToday(userId: string, sessionId: string, now = new Date()) {
	const session = await prisma.enPracticeSession.findFirst({ where: { id: sessionId, userId, mode: 'review' } });
	if (!session) throw new AppError('Không tìm thấy phiên học hôm nay', 404);
	if (!session.endedAt) {
		const elapsed = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
		const responseTime = await prisma.enReview.aggregate({ where: { sessionId: session.id, userId }, _sum: { responseMs: true } });
		const measuredSeconds = Math.ceil((responseTime._sum.responseMs ?? 0) / 1000);
		await prisma.enPracticeSession.update({ where: { id: session.id }, data: { endedAt: now, activeSeconds: Math.min(measuredSeconds, elapsed) } });
	}
	const [overview, changes] = await Promise.all([
		getTodayOverview(userId, now),
		prisma.enReview.findMany({ where: { sessionId: session.id, userId }, select: { boxBefore: true, boxAfter: true } }),
	]);
	return {
		ok: true as const,
		remaining: overview.dueCount + overview.newCount,
		tomorrowCount: overview.tomorrowCount,
		longTermCount: overview.longTermCount,
		intervalsUp: changes.filter(({ boxBefore, boxAfter }) => intervalChange(boxBefore, boxAfter).direction === 'up').length,
		intervalsDown: changes.filter(({ boxBefore, boxAfter }) => intervalChange(boxBefore, boxAfter).direction === 'down').length,
	};
}
