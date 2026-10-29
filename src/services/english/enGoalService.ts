import { cache } from 'react';
import { requestNow } from '@/lib/requestNow';
import { overviewCounts, studiedDays } from './enOverviewQueries';
import { streakStats } from '@/lib/english/streak';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_WEEKLY_DAYS_DEFAULT, EN_TX_MAX_WAIT_MS, EN_TX_TIMEOUT_MS } from '@/lib/english/constants';
import { shiftVnDay, vnDayKey, vnWeekDays } from '@/lib/english/gapRule';
import { vnDayStart } from '@/lib/english/schedule';
import { periodMetrics, type XpRow } from '@/lib/english/goalMetrics';
import { DAILY_QUEST_KEYS, WEEKLY_QUEST_KEYS, dailyQuests, parseQuests, topUpQuests, questProgress, QUEST_META, weeklyQuests, type Quest, type QuestAction, type QuestContext, type QuestMetrics } from '@/lib/english/quests';
import { achievementStatus, newlyEarned, nearestAchievements, parseAchievementKey, describeAchievement, TIER_NAMES, type LifetimeMetrics } from '@/lib/english/achievements';
import { DAILY_GOAL_DEFAULT, goalTierIndex, isDailyGoalXp, levelFromXp, XP, type LevelInfo, type XpKind } from '@/lib/english/xp';
import { getTodayOverview, computeTodayOverview, type TodayOverview } from '@/services/english/enDailyService';

export type GoalQuest = Quest & {
	title: string;
	hint: string;
	icon: (typeof QUEST_META)[keyof typeof QUEST_META]['icon'];
	action: QuestAction;
	current: number;
	done: boolean;
};

export type GoalAchievement = {
	id: string;
	title: string;
	description: string;
	/** Description with `{n}` left in, to render each tier. */
	template: string;
	group: string;
	icon: string;
	reached: number;
	tiers: number[];
	current: number;
	next: number | null;
};

export type UnseenAchievement = { key: string; title: string; tierName: string; description: string };

export type GoalBoard = {
	level: LevelInfo;
	seenLevel: number;
	/** Goal stored on the profile; shows on the next daily board when it differs from today's. */
	dailyGoalXp: number;
	goalChosen: boolean;
	streak: { current: number; longest: number };
	longTermCount: number;
	today: { day: string; xp: number; goal: number; quests: GoalQuest[]; resetsAt: string };
	week: {
		start: string;
		quests: GoalQuest[];
		chestOpened: boolean;
		chestXp: number;
		resetsAt: string;
		days: Array<{ day: string; xp: number; studied: boolean; goalMet: boolean; isToday: boolean; isFuture: boolean }>;
	};
	achievements: GoalAchievement[];
	nearest: string[];
	unseenAchievements: UnseenAchievement[];
};

/** What one action earned, for in-session toasts. */
export type GoalReward = { xp: number; quests: Array<{ title: string; xp: number }>; achievements: UnseenAchievement[] };

type PendingXp = { sourceKey: string; kind: XpKind; xp: number };

function questSourceKey(period: 'daily' | 'weekly', periodKey: string, key: string): string {
	return `quest:${period}:${periodKey}:${key}`;
}

/** Kept as the old daily-goal quest key so rewards paid before the XP rework are not paid twice. */
function goalSourceKey(day: string): string {
	return questSourceKey('daily', day, 'daily_goal');
}

function chestSourceKey(weekStart: string): string {
	return `chest:${weekStart}`;
}

export async function ensureBoard(userId: string, period: 'daily' | 'weekly', periodKey: string, build: () => Promise<Quest[]>): Promise<Quest[]> {
	const where = { userId_period_periodKey: { userId, period, periodKey } };
	const existing = await prisma.enQuestBoard.findUnique({ where, select: { quests: true } });
	if (existing) {
		const quests = parseQuests(existing.quests);
		const keys = period === 'daily' ? DAILY_QUEST_KEYS : WEEKLY_QUEST_KEYS;
		if (quests.every((quest) => quest.target > 0) && keys.every((key) => quests.some((quest) => quest.key === key))) return quests;
		const topped = topUpQuests(quests, await build());
		if (JSON.stringify(topped) !== JSON.stringify(quests)) await prisma.enQuestBoard.update({ where, data: { quests: topped } });
		return topped;
	}
	const quests = await build();
	// Two tabs can open the board at once; the first insert wins and both read it back.
	await prisma.enQuestBoard.createMany({ data: [{ userId, period, periodKey, quests }], skipDuplicates: true });
	const row = await prisma.enQuestBoard.findUnique({ where, select: { quests: true } });
	return parseQuests(row?.quests ?? quests);
}

async function questContext(userId: string, now: Date, dailyGoalXp: number, weeklyDaysGoal: number): Promise<QuestContext> {
	const counts = await overviewCounts(userId, now);
	return { tier: goalTierIndex(dailyGoalXp), weeklyDaysGoal, srsAvailable: counts.dueTotal + counts.newCount, enrolledSets: counts.enrolledSets };
}

/** Small scalar snapshot replaces several full-table reads and independent round trips. */
async function rewardSnapshot(userId: string) {
	const [row] = await prisma.$queryRaw<Array<{
		dailyXpGoal: number | null; weeklyDaysGoal: number | null; dailyGoalChosenAt: Date | null; seenLevel: number | null;
		totalXp: number; learned: number; longTerm: number; revived: number; goalDays: number; chests: number;
		legacySessionsFinished: number; guidedSessionsFinished: number; enrolledSets: number;
	}>>`
		SELECT p."dailyXpGoal", p."weeklyDaysGoal", p."dailyGoalChosenAt", p."seenLevel",
		(SELECT COALESCE(sum(x."xp"), 0)::int FROM "EnXpEvent" x WHERE x."userId" = ${userId}) AS "totalXp",
		(SELECT count(*)::int FROM "EnWordState" w WHERE w."userId" = ${userId} AND w."box" > 0) AS learned,
		(SELECT count(*)::int FROM "EnWordState" w WHERE w."userId" = ${userId} AND w."box" >= 4) AS "longTerm",
		(SELECT count(*)::int FROM "EnWordState" w WHERE w."userId" = ${userId} AND w."box" > 0 AND w."lapses" > 0 AND w."box" >= 3) AS revived,
		(SELECT count(*)::int FROM "EnXpEvent" x WHERE x."userId" = ${userId} AND x."kind" = 'goal') AS "goalDays",
		(SELECT count(*)::int FROM "EnXpEvent" x WHERE x."userId" = ${userId} AND x."kind" = 'chest') AS chests,
		(SELECT count(*)::int FROM "EnPracticeSession" s WHERE s."userId" = ${userId} AND s."mode" = 'review' AND s."endedAt" IS NOT NULL) AS "legacySessionsFinished",
		(SELECT count(*)::int FROM "EnGuidedReviewSession" s WHERE s."userId" = ${userId} AND s."endedAt" IS NOT NULL) AS "guidedSessionsFinished",
		(SELECT count(*)::int FROM "EnEnrollment" e JOIN "EnSet" st ON st."id" = e."setId" AND st."status" = 'published' WHERE e."userId" = ${userId}) AS "enrolledSets"
		FROM (SELECT 1) seed LEFT JOIN "EnLearnerProfile" p ON p."userId" = ${userId}`;
	return row!;
}

/** Everything the board and the reward step need, read in one pass. */
export async function loadRewardState(userId: string, now: Date) {
	const today = vnDayKey(now);
	const weekDays = vnWeekDays(today);
	const weekStart = weekDays[0]!;
	const snapshot = await rewardSnapshot(userId);
	const profile = snapshot.dailyXpGoal === null ? null : { dailyXpGoal: snapshot.dailyXpGoal, weeklyDaysGoal: snapshot.weeklyDaysGoal!, dailyGoalChosenAt: snapshot.dailyGoalChosenAt, seenLevel: snapshot.seenLevel! };
	const dailyGoalXp = profile?.dailyXpGoal ?? DAILY_GOAL_DEFAULT;
	const weeklyDaysGoal = profile?.weeklyDaysGoal ?? EN_WEEKLY_DAYS_DEFAULT;
	let context: Promise<QuestContext> | undefined;
	const ctx = () => context ??= questContext(userId, now, dailyGoalXp, weeklyDaysGoal);
	const weekFrom = vnDayStart(weekStart);
	const [daily, weeklyBoard, reviews, guidedReviews, xpRows, achievements, studied] = await Promise.all([
		ensureBoard(userId, 'daily', today, async () => dailyQuests(await ctx())),
		ensureBoard(userId, 'weekly', weekStart, async () => weeklyQuests(await ctx())),
		prisma.enReview.findMany({ where: { userId, at: { gte: weekFrom } }, select: { at: true, scheduled: true } }),
		prisma.enGuidedReviewQuestion.findMany({ where: { kind: 'main', session: { userId, questions: { some: { kind: 'main', answeredAt: { gte: weekFrom } } } } }, select: { sessionId: true, chunkNumber: true, answer: true, answeredAt: true, correct: true } }),
		prisma.enXpEvent.findMany({ where: { userId, day: { gte: weekStart } }, select: { day: true, xp: true, kind: true, sourceKey: true } }),
		prisma.enAchievement.findMany({ where: { userId }, select: { key: true, seenAt: true } }),
		studiedDays(userId, vnDayStart(shiftVnDay(today, -365))),
	]);
	const guidedRows = guidedReviews.map((row) => ({ sessionId: row.sessionId, chunkNumber: row.chunkNumber, answered: row.answer !== null && row.answeredAt !== null, answeredAt: row.answeredAt, correct: row.correct === true }));
	// Boards stored before the chest became the only weekly reward still carry quest XP.
	const weekly = weeklyBoard.map((quest) => ({ ...quest, xp: 0 }));
	const base = { reviews, guided: guidedRows, xp: xpRows as XpRow[] };
	const dayMetrics = periodMetrics({ ...base, days: new Set([today]) });
	const lifetime: LifetimeMetrics = {
		longTerm: snapshot.longTerm,
		learned: snapshot.learned,
		longestStreak: streakStats(studied, today).longest,
		goalDays: snapshot.goalDays,
		chests: snapshot.chests,
		revived: snapshot.revived,
		sessionsFinished: snapshot.legacySessionsFinished + snapshot.guidedSessionsFinished,
		enrolledSets: snapshot.enrolledSets,
	};
	return {
		today,
		weekDays,
		weekStart,
		profile,
		dailyGoalXp,
		daily,
		weekly,
		dayMetrics,
		weekMetrics: periodMetrics({ ...base, days: new Set(weekDays) }),
		claimed: new Set(xpRows.map((row) => row.sourceKey)),
		xpRows,
		totalXp: snapshot.totalXp,
		lifetime,
		achievements,
	};
}

type RewardState = Awaited<ReturnType<typeof loadRewardState>>;
type GoalState = RewardState & { overview: TodayOverview };

async function loadBoardState(userId: string, now: Date, cachedOverview: boolean): Promise<GoalState> {
	const [state, overview] = await Promise.all([loadRewardState(userId, now), cachedOverview ? getTodayOverview(userId) : computeTodayOverview(userId, now)]);
	return { ...state, overview };
}

/**
 * Quest, chest and achievement rewards that are due but not paid yet. Rewards add XP, which can
 * finish the XP quests in turn, so this repeats on in-memory metrics until nothing new is earned.
 */
export function pendingRewards(state: Pick<GoalState, 'today' | 'weekStart' | 'dailyGoalXp' | 'daily' | 'weekly' | 'dayMetrics' | 'weekMetrics' | 'claimed' | 'lifetime' | 'achievements'>) {
	const day: QuestMetrics = { ...state.dayMetrics };
	const week: QuestMetrics = { ...state.weekMetrics };
	const lifetime: LifetimeMetrics = { ...state.lifetime };
	const claimed = new Set(state.claimed);
	const unlocked = new Set(state.achievements.map((row) => row.key));
	const xp: PendingXp[] = [];
	const quests: Array<{ title: string; xp: number }> = [];
	const achievements: string[] = [];
	const pay = (event: PendingXp) => {
		claimed.add(event.sourceKey);
		xp.push(event);
		day.xp += event.xp;
		week.xp += event.xp;
	};
	for (let round = 0; round < 5; round += 1) {
		const before = xp.length;
		for (const quest of state.daily) {
			const sourceKey = questSourceKey('daily', state.today, quest.key);
			// A quest with nothing to do is done but pays nothing.
			if (quest.target <= 0 || quest.xp <= 0 || claimed.has(sourceKey) || !questProgress(quest, day).done) continue;
			pay({ sourceKey, kind: 'quest', xp: quest.xp });
			quests.push({ title: QUEST_META[quest.key].title(quest.target), xp: quest.xp });
		}
		const goalKey = goalSourceKey(state.today);
		if (!claimed.has(goalKey) && day.xp >= state.dailyGoalXp) {
			pay({ sourceKey: goalKey, kind: 'goal', xp: XP.dailyGoal });
			quests.push({ title: `Đạt mục tiêu ngày ${state.dailyGoalXp} XP`, xp: XP.dailyGoal });
			lifetime.goalDays += 1;
		}
		// Weekly quests pay nothing themselves: the chest opens once all of them are done.
		const chest = chestSourceKey(state.weekStart);
		if (!claimed.has(chest) && state.weekly.length > 0 && state.weekly.every((quest) => questProgress(quest, week).done)) {
			pay({ sourceKey: chest, kind: 'chest', xp: XP.weeklyChest });
			quests.push({ title: 'Mở rương tuần', xp: XP.weeklyChest });
			lifetime.chests += 1;
		}
		for (const earned of newlyEarned(lifetime, unlocked)) {
			unlocked.add(earned.key);
			achievements.push(earned.key);
			pay({ sourceKey: `ach:${earned.key}`, kind: 'achievement', xp: earned.xp });
		}
		if (xp.length === before) break;
	}
	return { xp, quests, achievements };
}

async function payRewards(userId: string, now: Date, state: RewardState) {
	const pending = pendingRewards(state);
	if (!pending.xp.length) return { ...pending, paid: 0 };
	const paid = await prisma.$transaction(async (tx) => {
		if (pending.achievements.length) {
			await tx.enAchievement.createMany({ data: pending.achievements.map((key) => ({ userId, key, unlockedAt: now })), skipDuplicates: true });
		}
		const created = await tx.enXpEvent.createManyAndReturn({
			data: pending.xp.map((event) => ({ ...event, userId, day: state.today, at: now })),
			skipDuplicates: true,
			select: { xp: true },
		});
		return created.reduce((sum, row) => sum + row.xp, 0);
	}, { timeout: EN_TX_TIMEOUT_MS, maxWait: Math.max(EN_TX_MAX_WAIT_MS, 30_000) });
	return { ...pending, paid };
}

function unseenView(key: string): UnseenAchievement | null {
	const parsed = parseAchievementKey(key);
	if (!parsed) return null;
	const tierName = parsed.def.tiers.length > 1 ? TIER_NAMES[parsed.tier] ?? '' : '';
	return { key, title: parsed.def.title, tierName, description: describeAchievement(parsed.def, parsed.tier) };
}

function questView(quest: Quest, metrics: QuestMetrics): GoalQuest {
	const meta = QUEST_META[quest.key];
	return { ...quest, title: meta.title(quest.target), hint: meta.hint, icon: meta.icon, action: meta.action, ...questProgress(quest, metrics) };
}

function boardView(state: GoalState): GoalBoard {
	const unlocked = new Set(state.achievements.map((row) => row.key));
	const statuses = achievementStatus(state.lifetime, unlocked);
	const goalDays = new Set(state.xpRows.filter((row) => row.kind === 'goal').map((row) => row.day));
	const studiedDays = new Set(state.overview.week.filter((entry) => entry.studied).map((entry) => entry.day));
	const dayXp = new Map<string, number>();
	for (const row of state.xpRows) dayXp.set(row.day, (dayXp.get(row.day) ?? 0) + row.xp);
	return {
		level: levelFromXp(state.totalXp),
		seenLevel: state.profile?.seenLevel ?? 0,
		dailyGoalXp: state.dailyGoalXp,
		goalChosen: Boolean(state.profile?.dailyGoalChosenAt),
		streak: { current: state.overview.streakDays, longest: state.overview.longestStreak },
		longTermCount: state.overview.longTermCount,
		today: {
			day: state.today,
			xp: state.dayMetrics.xp,
			goal: state.dailyGoalXp,
			quests: state.daily.map((quest) => questView(quest, state.dayMetrics)),
			resetsAt: vnDayStart(shiftVnDay(state.today, 1)).toISOString(),
		},
		week: {
			start: state.weekStart,
			quests: state.weekly.map((quest) => questView(quest, state.weekMetrics)),
			chestOpened: state.claimed.has(chestSourceKey(state.weekStart)),
			chestXp: XP.weeklyChest,
			resetsAt: vnDayStart(shiftVnDay(state.weekStart, 7)).toISOString(),
			days: state.weekDays.map((day) => ({ day, xp: dayXp.get(day) ?? 0, studied: studiedDays.has(day), goalMet: goalDays.has(day), isToday: day === state.today, isFuture: day > state.today })),
		},
		achievements: statuses.map((status) => ({
			id: status.def.id,
			title: status.def.title,
			description: describeAchievement(status.def, Math.min(status.reached, status.def.tiers.length - 1)),
			template: status.def.description,
			group: status.def.group,
			icon: status.def.icon,
			reached: status.reached,
			tiers: status.def.tiers,
			current: status.current,
			next: status.next,
		})),
		nearest: nearestAchievements(statuses).map((status) => status.def.id),
		unseenAchievements: state.achievements.filter((row) => !row.seenAt).flatMap((row) => unseenView(row.key) ?? []),
	};
}

/** Pays any rewards that are due, then returns what this action earned in total. */
export async function settleProgress(userId: string, actionXp = 0, now = new Date()): Promise<GoalReward> {
	const state = await loadRewardState(userId, now);
	const result = await payRewards(userId, now, state);
	return {
		xp: actionXp + result.paid,
		quests: result.quests,
		achievements: result.achievements.flatMap((key) => unseenView(key) ?? []),
	};
}

/** Board for the learner, after paying any reward that became due. Cached per request. */
export async function computeGoalBoard(userId: string, now: Date, cachedOverview = false): Promise<GoalBoard> {
	const state = await loadBoardState(userId, now, cachedOverview);
	const result = await payRewards(userId, now, state);
	return boardView(result.xp.length ? await loadBoardState(userId, now, cachedOverview) : state);
}

export const getGoalBoard = cache((userId: string) => computeGoalBoard(userId, requestNow(), true));

export async function setDailyGoal(userId: string, xp: number, now = new Date()) {
	if (!isDailyGoalXp(xp)) throw new AppError('Mục tiêu ngày không hợp lệ', 400);
	await prisma.enLearnerProfile.upsert({
		where: { userId },
		create: { userId, dailyXpGoal: xp, dailyGoalChosenAt: now },
		update: { dailyXpGoal: xp, dailyGoalChosenAt: now },
	});
	return { dailyXpGoal: xp };
}

/** Marks celebrations as shown: unlocked achievements and the current level. */
export async function markGoalsSeen(userId: string, input: { keys: string[]; level?: number }, now = new Date()) {
	if (input.keys.length) {
		await prisma.enAchievement.updateMany({ where: { userId, key: { in: input.keys }, seenAt: null }, data: { seenAt: now } });
	}
	if (input.level !== undefined) {
		const level = Math.max(0, Math.trunc(input.level));
		await prisma.enLearnerProfile.upsert({ where: { userId }, create: { userId, seenLevel: level }, update: { seenLevel: level } });
	}
	return { ok: true as const };
}

/** Rewards never block saving an answer: if settling fails, the learner still gets the answer's own XP. */
export async function safeSettle(userId: string, actionXp = 0, now = new Date()): Promise<GoalReward> {
	try {
		return await settleProgress(userId, actionXp, now);
	} catch (error) {
		console.error('[goals] settle failed', error);
		return { xp: actionXp, quests: [], achievements: [] };
	}
}
