import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_DAILY_DUE_LIMIT, EN_NEW_WORDS_DEFAULT, EN_ROUND_REVIEW_LIMIT, EN_TX_MAX_WAIT_MS, EN_TX_TIMEOUT_MS, EN_WEEKLY_DAYS_DEFAULT } from '@/lib/english/constants';
import { buildDailyQueue, dueAt, isLongTerm, isNearMiss, scheduleAnswer, stageOf, vnDayStart, type ScheduledState } from '@/lib/english/schedule';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { shiftVnDay, vnDayKey } from '@/lib/english/gapRule';
import { exampleParts, type SenseBundle } from '@/lib/english/senseBundle';
import { getSenseBundles } from '@/services/english/enContentService';

export type DailyPrompt = 'meaning' | 'cloze' | 'listen';

export type DailyCloze = { before: string; after: string; meaningVi: string };

export type DailyItem = {
	senseId: string;
	kind: 'review' | 'new';
	prompt: DailyPrompt;
	cloze: DailyCloze | null;
	bundle: SenseBundle;
};

export type DailyAnswerResult = {
	result: 'correct' | 'wrong' | 'near';
	expected: string;
	boxBefore: number;
	boxAfter: number;
	/** False when the answer came before the word was due, so the schedule did not move. */
	scheduled: boolean;
	nextDueAt: string | null;
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
};

const SCHEDULED_SELECT = { id: true, senseId: true, box: true, dueAt: true, lapses: true, introducedAt: true, lastReviewedAt: true } as const;

/** Every word the learner has started, from any set, so unenrolling never orphans a word from review. */
async function scheduledStates(userId: string): Promise<ScheduledState[]> {
	return prisma.enWordState.findMany({
		where: { userId, status: { not: 'new' }, sense: { status: 'published' } },
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

function pick<T>(values: T[]): T | undefined {
	return values[Math.floor(Math.random() * values.length)];
}

function hasAudio(bundle: SenseBundle): boolean {
	return Boolean(bundle.word.audioPath || bundle.word.audioUkPath || bundle.word.audioUsPath);
}

function promptFor(bundle: SenseBundle, kind: 'review' | 'new'): { prompt: DailyPrompt; cloze: DailyCloze | null } {
	if (kind === 'new') return { prompt: 'meaning', cloze: null };
	const clozes = bundle.examples.flatMap((example) => {
		const parts = exampleParts(example);
		return parts ? [{ before: parts.before, after: parts.after, meaningVi: example.meaningVi }] : [];
	});
	const options: DailyPrompt[] = ['meaning'];
	if (clozes.length) options.push('cloze');
	if (hasAudio(bundle)) options.push('listen');
	const prompt = pick(options) ?? 'meaning';
	return { prompt, cloze: prompt === 'cloze' ? pick(clozes) ?? null : null };
}

export async function startToday(userId: string, now = new Date()) {
	const { queue, dueTotal } = await planToday(userId, now);
	const senseIds = queue.map((item) => item.kind === 'review' ? item.state.senseId : item.senseId);
	if (!senseIds.length) return { sessionId: null, dueCount: 0, newCount: 0, dueTotal, items: [] as DailyItem[] };
	const session = await prisma.enPracticeSession.create({
		data: { userId, mode: 'review', activityKey: 'recall_type', senseIds, startedAt: now },
	});
	const bundles = await getSenseBundles(senseIds, true);
	const bySense = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
	const items = queue.flatMap((item): DailyItem[] => {
		const senseId = item.kind === 'review' ? item.state.senseId : item.senseId;
		const bundle = bySense.get(senseId);
		return bundle ? [{ senseId, kind: item.kind, bundle, ...promptFor(bundle, item.kind) }] : [];
	});
	return {
		sessionId: session.id,
		dueCount: items.filter((item) => item.kind === 'review').length,
		newCount: items.filter((item) => item.kind === 'new').length,
		dueTotal,
		items,
	};
}

/** Monday-first Vietnam week containing `now`. */
function weekDays(now: Date): string[] {
	const today = vnDayKey(now);
	const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
	return Array.from({ length: 7 }, (_, offset) => shiftVnDay(today, offset - weekday));
}

async function studiedDays(userId: string, from: Date): Promise<Set<string>> {
	const rows = await prisma.enReview.findMany({ where: { userId, at: { gte: from } }, select: { at: true } });
	return new Set(rows.map((row) => vnDayKey(row.at)));
}

export async function getTodayOverview(userId: string, now = new Date()): Promise<TodayOverview> {
	const { states, queue, dueTotal, introducedToday, enrolledSets } = await planToday(userId, now);
	const today = vnDayKey(now);
	const tomorrowEnd = vnDayStart(shiftVnDay(today, 2));
	const days = weekDays(now);
	const [studied, profile] = await Promise.all([
		studiedDays(userId, vnDayStart(days[0] ?? today)),
		prisma.enLearnerProfile.findUnique({ where: { userId }, select: { weeklyDaysGoal: true } }),
	]);
	const lapsed = states
		.filter((state) => state.lapses > 0 && state.box <= 2)
		.sort((a, b) => (b.lastReviewedAt?.getTime() ?? 0) - (a.lastReviewedAt?.getTime() ?? 0))
		.slice(0, 6);
	const lapsedBundles = await getSenseBundles(lapsed.map((state) => state.senseId), true);
	return {
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
}

function acceptedAnswers(bundle: SenseBundle): string[] {
	const targets = bundle.examples.map((example) => example.target.trim()).filter(Boolean);
	return [...new Set([...bundle.word.forms, ...targets])];
}

export async function answerToday(
	userId: string,
	input: { sessionId: string; senseId: string; answer: string; prompt?: DailyPrompt; responseMs?: number; giveUp?: boolean; typoChecked?: boolean },
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
	if (!correct && !input.giveUp && !input.typoChecked && isNearMiss(input.answer, [expected, ...accepted])) {
		return { result: 'near', expected: '', boxBefore: before, boxAfter: before, scheduled: false, nextDueAt: state?.dueAt.toISOString() ?? null };
	}
	const responseMs = Math.max(0, Math.min(120_000, Math.trunc(input.responseMs ?? 0)));
	const changed = !state || state.status === 'new' || state.dueAt <= now;
	const next = changed ? scheduleAnswer(state && state.status !== 'new' ? state : null, correct) : { box: before, lapses: state?.lapses ?? 0 };
	const nextDue = changed ? dueAt(next.box, now) : state?.dueAt ?? null;
	await prisma.$transaction(async (tx) => {
		if (changed) {
			const long = isLongTerm(next.box);
			await tx.enWordState.upsert({
				where: { userId_senseId: { userId, senseId: input.senseId } },
				create: { userId, senseId: input.senseId, status: 'practicing', box: next.box, lapses: next.lapses, introducedAt: now, dueAt: nextDue ?? now, lastReviewedAt: now, lastExposureAt: now },
				update: {
					status: long ? 'mastered' : 'practicing',
					box: next.box,
					lapses: next.lapses,
					dueAt: nextDue ?? now,
					lastReviewedAt: now,
					lastTestedAt: now,
					lastExposureAt: now,
					masteredAt: long ? state?.masteredAt ?? now : null,
					inMistakeBook: next.lapses > (state?.lapses ?? 0),
					mistakeAddedAt: next.lapses > (state?.lapses ?? 0) ? now : null,
					...(state?.status === 'new' ? { introducedAt: now } : {}),
				},
			});
		}
		await tx.enReview.create({ data: { sessionId: session.id, userId, senseId: input.senseId, at: now, prompt: input.prompt ?? 'meaning', correct, responseMs, boxBefore: before, boxAfter: next.box, scheduled: changed } });
	}, { timeout: EN_TX_TIMEOUT_MS, maxWait: EN_TX_MAX_WAIT_MS });
	return { result: correct ? 'correct' : 'wrong', expected, boxBefore: before, boxAfter: next.box, scheduled: changed, nextDueAt: nextDue?.toISOString() ?? null };
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
	const overview = await getTodayOverview(userId, now);
	return { ok: true as const, remaining: overview.dueCount + overview.newCount, tomorrowCount: overview.tomorrowCount, longTermCount: overview.longTermCount };
}

export async function getTodayProgress(userId: string, now = new Date()) {
	const today = vnDayKey(now);
	const since = vnDayStart(shiftVnDay(today, -29));
	const [states, reviews] = await Promise.all([
		prisma.enWordState.findMany({ where: { userId, status: { not: 'new' }, sense: { status: 'published' } }, select: { senseId: true, box: true, dueAt: true, lapses: true } }),
		prisma.enReview.findMany({ where: { userId, at: { gte: since } }, select: { at: true, correct: true, boxBefore: true, scheduled: true } }),
	]);
	const stages = { learning: 0, remembering: 0, long_term: 0 };
	for (const state of states) {
		const stage = stageOf(state.box);
		if (stage !== 'new') stages[stage] += 1;
	}
	const countsByBox = Array.from({ length: 6 }, (_, box) => ({ box, count: states.filter((state) => state.box === box).length }));
	const dueNext7Days = Array.from({ length: 7 }, (_, offset) => {
		const start = vnDayStart(shiftVnDay(today, offset));
		const end = vnDayStart(shiftVnDay(today, offset + 1));
		return { day: shiftVnDay(today, offset), count: states.filter((state) => (offset === 0 ? state.dueAt < end : state.dueAt >= start && state.dueAt < end)).length };
	});
	// Only on-schedule reviews of words already learned measure retention; first sightings and retries do not.
	const scheduled = reviews.filter((review) => review.scheduled && review.boxBefore > 0);
	const studied = new Set(reviews.map((review) => vnDayKey(review.at)));
	const activity = Array.from({ length: 30 }, (_, offset) => {
		const day = shiftVnDay(today, offset - 29);
		return { day, count: reviews.filter((review) => vnDayKey(review.at) === day).length };
	});
	const difficult = states.filter((state) => state.lapses > 0 && state.box <= 2).sort((a, b) => b.lapses - a.lapses).slice(0, 12);
	const bundles = await getSenseBundles(difficult.map((state) => state.senseId), true);
	const lapsesBySense = new Map(difficult.map((state) => [state.senseId, state.lapses]));
	return {
		stages,
		countsByBox,
		dueNext7Days,
		longTermCount: stages.long_term,
		learnedCount: states.length,
		accuracy30: scheduled.length ? scheduled.filter((review) => review.correct).length / scheduled.length : null,
		reviews30: reviews.length,
		daysStudied30: studied.size,
		activity,
		difficult: bundles.map((bundle) => ({ senseId: bundle.sense.id, lemma: bundle.word.lemma, ipa: bundle.word.ipa, meaningVi: bundle.sense.meaningVi, lapses: lapsesBySense.get(bundle.sense.id) ?? 0 })),
	};
}
