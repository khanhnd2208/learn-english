import { XP } from '@/lib/english/xp';

export type DailyQuestKey = 'srs_words' | 'review_correct' | 'quiz_done';
export type WeeklyQuestKey = 'week_days' | 'week_srs' | 'week_review';
export type QuestKey = DailyQuestKey | WeeklyQuestKey;

export type Quest = { key: QuestKey; target: number; xp: number };

/** Where a quest is done: the SRS round, the Review session or a graded quiz. */
export type QuestAction = 'srs' | 'review' | 'quiz';

export type QuestIcon = 'target' | 'star' | 'sprout' | 'flag' | 'shield' | 'spark' | 'sword' | 'trophy' | 'mountain' | 'chest';

export const QUEST_META: Record<QuestKey, { title: (target: number) => string; hint: string; icon: QuestIcon; action: QuestAction }> = {
	srs_words: { title: (n) => n > 0 ? `Ôn theo lịch ${n} từ` : 'Hôm nay không có từ đến hạn', hint: 'Mỗi từ đến hạn trả lời đúng +20 XP.', icon: 'sprout', action: 'srs' },
	review_correct: { title: (n) => n > 0 ? `Học & luyện đúng ${n} câu` : 'Chưa có bộ từ để học & luyện', hint: 'Câu chính đúng trong Học & luyện +10 XP, tối đa 300 XP mỗi ngày.', icon: 'star', action: 'review' },
	quiz_done: { title: (n) => n > 0 ? 'Làm 1 bài kiểm tra' : 'Chưa có bộ từ để làm bài kiểm tra', hint: 'Trắc nghiệm, điền từ hay nghe đều được.', icon: 'sword', action: 'quiz' },
	week_days: { title: (n) => `Học đủ ${n} ngày`, hint: 'Không cần ngày nào cũng học: nghỉ có kế hoạch vẫn ổn.', icon: 'mountain', action: 'srs' },
	week_srs: { title: (n) => `Ôn theo lịch ${n} từ trong tuần`, hint: 'Cộng dồn từ thứ Hai.', icon: 'chest', action: 'srs' },
	week_review: { title: (n) => `Học & luyện đúng ${n} câu trong tuần`, hint: 'Cộng dồn từ thứ Hai.', icon: 'trophy', action: 'review' },
};

/** Targets per daily-goal tier: light, steady, keen, warrior. */
const TIER_TARGETS = {
	srs: [10, 20, 30, 40],
	review: [10, 20, 30, 30],
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

/** Daily SRS and Review targets of a goal tier, for the tier picker. */
export function tierQuestTargets(tier: number): { srs: number; review: number } {
	return { srs: tierTarget('srs', tier), review: tierTarget('review', tier) };
}

/**
 * The same three quests every day. A quest with nothing to do (target 0) counts as done and pays no XP,
 * so a learner who followed the schedule is never penalised.
 */
export function dailyQuests(ctx: QuestContext): Quest[] {
	const quest = (key: DailyQuestKey, target: number): Quest => ({ key, target, xp: target > 0 ? XP.dailyQuest : 0 });
	return [
		quest('srs_words', Math.min(tierTarget('srs', ctx.tier), Math.max(0, ctx.srsAvailable))),
		quest('review_correct', ctx.enrolledSets > 0 ? tierTarget('review', ctx.tier) : 0),
		quest('quiz_done', ctx.enrolledSets > 0 ? 1 : 0),
	];
}

export function weeklyQuests(ctx: QuestContext): Quest[] {
	return [
		{ key: 'week_days', target: Math.max(1, Math.min(7, ctx.weeklyDaysGoal)), xp: XP.weeklyQuest },
		{ key: 'week_srs', target: 5 * tierTarget('srs', ctx.tier), xp: XP.weeklyQuest },
		{ key: 'week_review', target: 5 * tierTarget('review', ctx.tier), xp: XP.weeklyQuest },
	];
}

export type QuestMetrics = {
	xp: number;
	/** Scheduled SRS answers, right or wrong. */
	srsWords: number;
	/** Correct main questions in Review. */
	reviewCorrect: number;
	quizzesDone: number;
	daysStudied: number;
};

export function emptyMetrics(): QuestMetrics {
	return { xp: 0, srsWords: 0, reviewCorrect: 0, quizzesDone: 0, daysStudied: 0 };
}

const CURRENT: Record<QuestKey, (metrics: QuestMetrics) => number> = {
	srs_words: (m) => m.srsWords,
	review_correct: (m) => m.reviewCorrect,
	quiz_done: (m) => m.quizzesDone,
	week_days: (m) => m.daysStudied,
	week_srs: (m) => m.srsWords,
	week_review: (m) => m.reviewCorrect,
};

export function questProgress(quest: Quest, metrics: QuestMetrics): { current: number; done: boolean } {
	const current = Math.max(0, Math.min(quest.target, CURRENT[quest.key](metrics)));
	return { current, done: current >= quest.target };
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

/**
 * The set a "do a quiz" quest should open: the one with the most words due, then the most
 * words learned, so the learner lands on a real quiz instead of a list to choose from.
 */
export function pickQuizSet(sets: Array<{ id: string; enrolled: boolean; dueToday: number; learned: number }>): string | null {
	const enrolled = sets.filter((set) => set.enrolled);
	enrolled.sort((a, b) => b.dueToday - a.dueToday || b.learned - a.learned);
	return enrolled[0]?.id ?? null;
}

export function quizHrefFor(sets: Array<{ id: string; enrolled: boolean; dueToday: number; learned: number }>): string {
	const id = pickQuizSet(sets);
	return id ? `/sets/${id}/test?type=mcq` : '/store';
}
