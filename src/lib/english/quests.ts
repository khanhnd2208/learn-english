import { XP } from '@/lib/english/xp';

export type DailyQuestKey = 'daily_goal' | 'correct_reviews' | 'new_words' | 'clear_due' | 'rescue' | 'combo' | 'quiz_any' | 'quiz_kinds';
export type WeeklyQuestKey = 'week_days' | 'week_xp' | 'week_longterm' | 'week_goal_days';
export type QuestKey = DailyQuestKey | WeeklyQuestKey;

export type Quest = { key: QuestKey; target: number; xp: number };

/** Where a quest is done: the Review session or a graded quiz. */
export type QuestAction = 'review' | 'quiz';

export type QuestIcon = 'target' | 'star' | 'sprout' | 'flag' | 'shield' | 'spark' | 'sword' | 'trophy' | 'mountain' | 'chest';

export const QUEST_META: Record<QuestKey, { title: (target: number) => string; hint: string; icon: QuestIcon; action: QuestAction }> = {
	daily_goal: { title: (n) => `Đạt mục tiêu ngày ${n} XP`, hint: 'Mỗi câu ôn đúng +2 XP, từ mới +2 XP.', icon: 'target', action: 'review' },
	correct_reviews: { title: (n) => `Trả lời đúng ${n} câu luyện`, hint: 'Tính câu chính trả lời đúng trong Ôn tập.', icon: 'star', action: 'review' },
	new_words: { title: (n) => `Học ${n} từ mới`, hint: 'Từ mới xuất hiện trong lượt Ôn hôm nay.', icon: 'sprout', action: 'review' },
	clear_due: { title: (n) => `Ôn hết ${n} từ đến hạn`, hint: 'Giữ đúng lịch ôn giúp nhớ lâu hơn.', icon: 'flag', action: 'review' },
	rescue: { title: (n) => `Nhớ lại ${n} từ từng quên`, hint: 'Từ bạn từng trả lời sai, nay nhớ lại được.', icon: 'shield', action: 'review' },
	combo: { title: (n) => `Đúng ${n} câu liên tiếp`, hint: 'Tính các câu chính trong cùng một phiên Ôn tập.', icon: 'spark', action: 'review' },
	quiz_any: { title: () => 'Đạt ≥ 70% một bài kiểm tra', hint: 'Bất kỳ dạng kiểm tra, bộ từ nào.', icon: 'sword', action: 'quiz' },
	quiz_kinds: { title: (n) => n > 1 ? `Làm ${n} dạng kiểm tra khác nhau` : 'Làm 1 bài kiểm tra', hint: 'Trắc nghiệm, điền từ, nghe.', icon: 'trophy', action: 'quiz' },
	week_days: { title: (n) => `Học đủ ${n} ngày trong tuần`, hint: 'Không cần ngày nào cũng học: nghỉ có kế hoạch vẫn ổn.', icon: 'mountain', action: 'review' },
	week_xp: { title: (n) => `Kiếm ${n} XP trong tuần`, hint: 'Cộng dồn XP từ thứ Hai.', icon: 'star', action: 'review' },
	week_longterm: { title: (n) => `Đưa ${n} từ lên Nhớ lâu`, hint: 'Từ lên hộp 4 sau nhiều lần ôn đúng cách ngày.', icon: 'chest', action: 'review' },
	week_goal_days: { title: (n) => `Đạt mục tiêu ngày ${n} lần`, hint: 'Mỗi ngày đạt mục tiêu XP tính một lần.', icon: 'target', action: 'review' },
};

/** Targets per daily-goal tier: light, steady, keen, warrior. */
const TIER_TARGETS = {
	correct_reviews: [8, 15, 25, 35],
	new_words: [3, 5, 8, 10],
	rescue: [2, 3, 5, 5],
	combo: [5, 8, 12, 15],
	quiz_kinds: [1, 2, 2, 3],
	week_longterm: [3, 5, 8, 12],
} as const;

export type QuestContext = {
	tier: number;
	dailyGoalXp: number;
	weeklyDaysGoal: number;
	/** Scheduled words (box > 0) the learner has. */
	learnedCount: number;
	/** New words that can still be introduced today. */
	newAvailable: number;
	dueTotal: number;
	/** Due words the learner has forgotten before. */
	lapsedDue: number;
	enrolledSets: number;
	/** Words in box 2 or higher, which can reach long-term within a week. */
	rememberingCount: number;
	practiceAvailable?: number;
};

function tierTarget(key: keyof typeof TIER_TARGETS, tier: number): number {
	const targets = TIER_TARGETS[key];
	return targets[Math.max(0, Math.min(targets.length - 1, tier))]!;
}

/** FNV-1a, so a learner sees the same quests for the whole day. */
export function seedHash(text: string): number {
	let hash = 0x811c9dc5;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

function seededOrder<T>(values: T[], seed: number): T[] {
	let state = seed || 1;
	const next = () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
	const copy = [...values];
	for (let index = copy.length - 1; index > 0; index -= 1) {
		const swap = Math.floor(next() * (index + 1));
		[copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
	}
	return copy;
}

/** Quests the learner can actually finish today, with targets scaled to their tier. */
export function dailyCandidates(ctx: QuestContext): Quest[] {
	const reviewable = ctx.practiceAvailable ?? (ctx.dueTotal + ctx.newAvailable);
	const quests: Quest[] = [];
	const add = (key: DailyQuestKey, target: number) => { if (target > 0) quests.push({ key, target, xp: XP.dailyQuest }); };
	if (reviewable > 0) add('correct_reviews', Math.min(tierTarget('correct_reviews', ctx.tier), reviewable));
	if (reviewable >= 5) add('combo', Math.min(tierTarget('combo', ctx.tier), reviewable));
	if (ctx.enrolledSets > 0) {
		add('quiz_any', 1);
		add('quiz_kinds', tierTarget('quiz_kinds', ctx.tier));
	}
	return quests;
}

/** The daily goal plus two quests picked from what is possible today, at most one of them a quiz. */
export function pickDailyQuests(seed: string, ctx: QuestContext): Quest[] {
	const picked: Quest[] = [{ key: 'daily_goal', target: ctx.dailyGoalXp, xp: XP.dailyQuest }];
	for (const quest of seededOrder(dailyCandidates(ctx), seedHash(seed))) {
		if (picked.length >= 3) break;
		const isQuiz = QUEST_META[quest.key].action === 'quiz';
		if (isQuiz && picked.some((entry) => QUEST_META[entry.key].action === 'quiz')) continue;
		picked.push(quest);
	}
	return picked;
}

export function weeklyQuests(ctx: QuestContext): Quest[] {
	return [
		{ key: 'week_days', target: Math.max(1, Math.min(7, ctx.weeklyDaysGoal)), xp: XP.weeklyQuest },
		{ key: 'week_xp', target: ctx.dailyGoalXp * 4, xp: XP.weeklyQuest },
		{ key: 'week_goal_days', target: 3, xp: XP.weeklyQuest },
	];
}

export type QuestMetrics = {
	xp: number;
	correctReviews: number;
	newWords: number;
	rescued: number;
	bestCombo: number;
	dueRemaining: number;
	quizzesPassed: number;
	quizKinds: number;
	daysStudied: number;
	goalDays: number;
	longTermGained: number;
};

export function emptyMetrics(): QuestMetrics {
	return { xp: 0, correctReviews: 0, newWords: 0, rescued: 0, bestCombo: 0, dueRemaining: 0, quizzesPassed: 0, quizKinds: 0, daysStudied: 0, goalDays: 0, longTermGained: 0 };
}

const CURRENT: Record<QuestKey, (metrics: QuestMetrics, target: number) => number> = {
	daily_goal: (m) => m.xp,
	correct_reviews: (m) => m.correctReviews,
	new_words: (m) => m.newWords,
	clear_due: (m, target) => target - m.dueRemaining,
	rescue: (m) => m.rescued,
	combo: (m) => m.bestCombo,
	quiz_any: (m) => m.quizzesPassed,
	quiz_kinds: (m) => m.quizKinds,
	week_days: (m) => m.daysStudied,
	week_xp: (m) => m.xp,
	week_longterm: (m) => m.longTermGained,
	week_goal_days: (m) => m.goalDays,
};

export function questProgress(quest: Quest, metrics: QuestMetrics): { current: number; done: boolean } {
	const current = Math.max(0, Math.min(quest.target, CURRENT[quest.key](metrics, quest.target)));
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
 * A board fixed early in the day can be short, e.g. before the learner downloaded a set.
 * Fill the free slots from a fresh pick, keeping every quest already shown.
 */
export function topUpQuests(current: Quest[], fresh: Quest[], size = 3): Quest[] {
	if (current.length >= size) return current;
	const keys = new Set(current.map((quest) => quest.key));
	const hasQuiz = current.some((quest) => QUEST_META[quest.key].action === 'quiz');
	const extra = fresh.filter((quest) => !keys.has(quest.key) && !(hasQuiz && QUEST_META[quest.key].action === 'quiz'));
	return [...current, ...extra].slice(0, Math.max(size, current.length));
}
