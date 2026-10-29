import { Prisma } from '@prisma/client';
import { cache } from 'react';
import { requestNow } from '@/lib/requestNow';
import { liveCte, overviewCounts, studiedDays, recentReviewStats, recentLapseIds } from './enOverviewQueries';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_HINT_MAX_BOX, EN_TX_MAX_WAIT_MS, EN_TX_TIMEOUT_MS, EN_WEEKLY_DAYS_DEFAULT } from '@/lib/english/constants';
import { pickSessionWords, intervalChange, isNearMiss, randomRng, scheduleMove, vnDayStart, type ScheduledState } from '@/lib/english/schedule';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { shiftVnDay, vnDayKey, vnWeekDays } from '@/lib/english/gapRule';
import { streakStats } from '@/lib/english/streak';
import { pacedEnough, reviewXpEvents } from '@/lib/english/xp';
import { cardExampleOf, type SenseBundle } from '@/lib/english/senseBundle';
import { warmBundleSpeech } from '@/services/english/enAudioService';
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

/** Words whose audio the server prepares when a round starts; the player fetches the rest as the learner goes. */
const WARM_AHEAD = 20;

async function planToday(userId: string, now: Date) {
	const [due, newRows] = await Promise.all([
		prisma.$queryRaw<ScheduledState[]>(Prisma.sql`${liveCte(userId)} SELECT "id", "senseId", "box", "dueAt", "lapses", "introducedAt", "lastReviewedAt" FROM sched WHERE "dueAt" <= ${now}`),
		prisma.$queryRaw<Array<{ senseId: string }>>(Prisma.sql`${liveCte(userId)} SELECT live."senseId" FROM live LEFT JOIN "EnWordState" ws ON ws."senseId" = live."senseId" AND ws."userId" = ${userId} AND ws."box" > 0 WHERE ws."id" IS NULL`),
	]);
	return { dueTotal: due.length, queue: pickSessionWords(due, newRows.map((row) => row.senseId), randomRng()) };
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
	warmBundleSpeech(senseIds.slice(0, WARM_AHEAD).flatMap((senseId) => bySense.get(senseId) ?? []));
	const items = queue.flatMap((item): DailyItem[] => {
		const senseId = item.kind === 'new' ? item.senseId : item.state.senseId;
		const original = bySense.get(senseId);
		const card = original && cardExampleOf(original.examples);
		const bundle = original ? { ...original, examples: card ? [card] : [] } : undefined;
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

/** Uncached entry for route handlers, tests and explicit server clocks. */
export async function computeTodayOverview(userId: string, now: Date): Promise<TodayOverview> {
	const today = vnDayKey(now);
	const [counts, studied, profile, reviews, guidedToday, lapsedIds] = await Promise.all([
		overviewCounts(userId, now),
		studiedDays(userId, vnDayStart(shiftVnDay(today, -365))),
		prisma.enLearnerProfile.findUnique({ where: { userId }, select: { weeklyDaysGoal: true } }),
		recentReviewStats(userId, today),
		prisma.enGuidedReviewQuestion.count({ where: { kind: 'main', answeredAt: { gte: vnDayStart(today) }, session: { userId } } }),
		recentLapseIds(userId),
	]);
	const bundles = await getSenseBundles(lapsedIds, true);
	const byId = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
	const streak = streakStats(studied, today);
	return {
		dueTotal: counts.dueTotal, dueCount: counts.dueTotal, newCount: counts.newCount,
		enrolledSets: counts.enrolledSets, tomorrowCount: counts.tomorrowCount,
		longTermCount: counts.longTermCount, learnedCount: counts.learnedCount,
		week: vnWeekDays(today).map((day) => ({ day, studied: studied.has(day), isToday: day === today, isFuture: day > today })),
		weeklyGoal: profile?.weeklyDaysGoal ?? EN_WEEKLY_DAYS_DEFAULT,
		recentLapses: lapsedIds.flatMap((id) => { const bundle = byId.get(id); return bundle ? [{ senseId: id, lemma: bundle.word.lemma, meaningVi: bundle.sense.meaningVi }] : []; }),
		reviewedToday: reviews.reviewedToday, practicedToday: guidedToday, practiceAvailable: counts.liveCount,
		streakDays: streak.current, longestStreak: streak.longest, lapsedDue: counts.lapsedDue,
		rememberingCount: counts.rememberingCount, dueNext7Days: counts.dueNext7Days,
		accuracy30: reviews.scheduledTotal ? reviews.scheduledCorrect / reviews.scheduledTotal : null,
	};
}

/** Primitive cache key shared by the layout and page within one server render. */
export const getTodayOverview = cache((userId: string) => computeTodayOverview(userId, requestNow()));

function acceptedAnswers(bundle: SenseBundle): string[] { return bundle.word.forms; }

export async function answerToday(
	userId: string,
	input: { sessionId: string; senseId: string; answer: string; responseMs?: number; giveUp?: boolean; typoChecked?: boolean },
	now = new Date(),
): Promise<DailyAnswerResult> {
	const session = await prisma.enPracticeSession.findFirst({ where: { id: input.sessionId, userId, mode: 'review' }, select: { id: true, startedAt: true, endedAt: true, senseIds: true } });
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
		await tx.enStudyDay.createMany({ data: [{ userId, day }], skipDuplicates: true });
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
		overviewCounts(userId, now),
		prisma.enReview.findMany({ where: { sessionId: session.id, userId }, select: { boxBefore: true, boxAfter: true } }),
	]);
	return {
		ok: true as const,
		remaining: overview.dueTotal + overview.newCount,
		tomorrowCount: overview.tomorrowCount,
		longTermCount: overview.longTermCount,
		intervalsUp: changes.filter(({ boxBefore, boxAfter }) => intervalChange(boxBefore, boxAfter).direction === 'up').length,
		intervalsDown: changes.filter(({ boxBefore, boxAfter }) => intervalChange(boxBefore, boxAfter).direction === 'down').length,
	};
}
