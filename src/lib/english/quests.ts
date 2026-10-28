import { EN_GUIDED_CHUNK_SIZE } from '@/lib/english/constants';
import { XP } from '@/lib/english/xp';

export type DailyQuestKey = 'srs_words' | 'chunk_done';
export type WeeklyQuestKey = 'week_days';
export type QuestKey = DailyQuestKey | WeeklyQuestKey;

export type Quest = { key: QuestKey; target: number; xp: number };

/** Where a quest is done: the SRS round or a set Review chunk. */
export type QuestAction = 'srs' | 'review';

export type QuestIcon = 'target' | 'star' | 'sprout' | 'flag' | 'shield' | 'spark' | 'sword' | 'trophy' | 'mountain' | 'chest';

export const QUEST_META: Record<QuestKey, { title: (target: number) => string; hint: string; icon: QuestIcon; action: QuestAction }> = {
	srs_words: { title: (n) => n > 0 ? `Ôn ${n} từ đến hạn` : 'Hôm nay không có từ đến hạn', hint: `Làm trong Ôn luân phiên. Mỗi từ trả lời đúng +${XP.srs} XP.`, icon: 'sprout', action: 'srs' },
	chunk_done: { title: (n) => n > 0 ? `Xong ${n} chặng Ôn theo bộ` : 'Chưa có bộ từ để ôn theo bộ', hint: `Mỗi chặng: xem ${EN_GUIDED_CHUNK_SIZE} từ rồi trả lời ${EN_GUIDED_CHUNK_SIZE} câu.`, icon: 'sword', action: 'review' },
	week_days: { title: (n) => `Học đủ ${n} ngày trong tuần`, hint: 'Ngày nào có ôn là tính. Đủ ngày thì mở rương tuần.', icon: 'mountain', action: 'srs' },
};

/** Targets per daily-goal tier: light, steady, keen, warrior. */
const TIER_TARGETS = {
	srs: [10, 20, 30, 40],
	chunks: [1, 2, 3, 4],
} as const;

export type QuestContext = {
	tier: number;
	weeklyDaysGoal: number;
	/** Due words plus new words the learner can still study with SRS today. */
	srsAvailable: number;
	enrolledSets: number;
};

function tierTarget(key: keyof typeof TIER_TARGETS, tier: number): number {
	const targets = TIER_TARGETS[key];
	return targets[Math.max(0, Math.min(targets.length - 1, tier))]!;
}

/** Daily SRS and chunk targets of a goal tier, for the tier picker. */
export function tierQuestTargets(tier: number): { srs: number; chunks: number } {
	return { srs: tierTarget('srs', tier), chunks: tierTarget('chunks', tier) };
}

/**
 * The same two quests every day: due words in the SRS round and chunks of set Review. A quest with nothing to do (target 0) counts as done and pays no XP,
 * so a learner who followed the schedule is never penalised.
 */
export function dailyQuests(ctx: QuestContext): Quest[] {
	const quest = (key: DailyQuestKey, target: number): Quest => ({ key, target, xp: target > 0 ? XP.dailyQuest : 0 });
	return [
		quest('srs_words', Math.min(tierTarget('srs', ctx.tier), Math.max(0, ctx.srsAvailable))),
		quest('chunk_done', ctx.enrolledSets > 0 ? tierTarget('chunks', ctx.tier) : 0),
	];
}

/** One weekly quest: study on enough days. It pays nothing itself; finishing it opens the weekly chest. */
export function weeklyQuests(ctx: QuestContext): Quest[] {
	return [{ key: 'week_days', target: Math.max(1, Math.min(7, ctx.weeklyDaysGoal)), xp: 0 }];
}

export type QuestMetrics = {
	xp: number;
	/** Scheduled SRS answers, right or wrong. */
	srsWords: number;
	chunksDone: number;
	daysStudied: number;
};

export function emptyMetrics(): QuestMetrics {
	return { xp: 0, srsWords: 0, chunksDone: 0, daysStudied: 0 };
}

const CURRENT: Record<QuestKey, (metrics: QuestMetrics) => number> = {
	srs_words: (m) => m.srsWords,
	chunk_done: (m) => m.chunksDone,
	week_days: (m) => m.daysStudied,
};

export function questProgress(quest: Quest, metrics: QuestMetrics): { current: number; done: boolean } {
	const current = Math.max(0, Math.min(quest.target, CURRENT[quest.key](metrics)));
	return { current, done: current >= quest.target };
}

/** A quest with nothing to do today (no due words, no sets) is idle, not done. */
export function isIdleQuest(quest: Pick<Quest, 'target'>): boolean {
	return quest.target === 0;
}

/** Quests still in play plus the daily XP goal: the "x/y" shown on the note and in the sidebar. */
export function todayQuestCount(quests: Array<Pick<Quest, 'target'> & { done: boolean }>, xp: number, goal: number): { done: number; total: number } {
	const active = quests.filter((quest) => !isIdleQuest(quest));
	return { done: active.filter((quest) => quest.done).length + (xp >= goal ? 1 : 0), total: active.length + 1 };
}

/** Quest boards are stored as JSON; drop anything that is not a known quest. */
export function parseQuests(value: unknown): Quest[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry): Quest[] => {
		if (!entry || typeof entry !== 'object') return [];
		const { key, target, xp } = entry as Record<string, unknown>;
		return typeof key === 'string' && key in QUEST_META && typeof target === 'number' && typeof xp === 'number' ? [{ key: key as QuestKey, target, xp }] : [];
	});
}

/** "5 giờ", "35 phút", "3 ngày": time until a board resets. */
export function timeLeftLabel(resetsAt: string, now: Date): string {
	const minutes = Math.max(1, Math.ceil((new Date(resetsAt).getTime() - now.getTime()) / 60_000));
	if (minutes < 60) return `${minutes} phút`;
	const hours = Math.ceil(minutes / 60);
	if (hours < 24) return `${hours} giờ`;
	return `${Math.max(1, Math.round(hours / 24))} ngày`;
}

/**
 * A board fixed early in the day can have empty quests, e.g. before the learner downloaded a set.
 * Fill the missing quests and replace unpaid empty ones from a fresh build, keeping every other quest as shown.
 */
export function topUpQuests(current: Quest[], fresh: Quest[]): Quest[] {
	const filled = current.map((quest) => {
		const next = quest.target === 0 ? fresh.find((entry) => entry.key === quest.key) : undefined;
		return next && next.target > 0 ? next : quest;
	});
	const keys = new Set(filled.map((quest) => quest.key));
	return [...filled, ...fresh.filter((quest) => !keys.has(quest.key))];
}
