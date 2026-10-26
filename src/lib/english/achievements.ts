export type LifetimeMetrics = {
	longTerm: number;
	learned: number;
	longestStreak: number;
	goalDays: number;
	chests: number;
	perfectQuizzes: number;
	revived: number;
	sessionsFinished: number;
	enrolledSets: number;
	quizKindsToday: number;
};

export type AchievementGroup = 'memory' | 'vocab' | 'habit' | 'quiz' | 'mistakes' | 'start';

export const ACHIEVEMENT_GROUPS: Record<AchievementGroup, string> = {
	memory: 'Ghi nhớ',
	vocab: 'Vốn từ',
	habit: 'Kiên trì',
	quiz: 'Kiểm tra',
	mistakes: 'Lỗi sai',
	start: 'Khởi đầu',
};

export type AchievementIcon = 'chest' | 'compass' | 'spark' | 'target' | 'trophy' | 'sword' | 'shield' | 'flag' | 'map' | 'star';

export type AchievementDef = {
	id: string;
	title: string;
	/** Copy with `{n}` for the tier target. */
	description: string;
	group: AchievementGroup;
	icon: AchievementIcon;
	metric: keyof LifetimeMetrics;
	tiers: number[];
};

export const ACHIEVEMENTS: AchievementDef[] = [
	{ id: 'memory_vault', title: 'Kho báu trí nhớ', description: 'Có {n} từ ở nhóm Nhớ lâu', group: 'memory', icon: 'chest', metric: 'longTerm', tiers: [10, 50, 200, 500] },
	{ id: 'explorer', title: 'Nhà thám hiểm', description: 'Học {n} từ', group: 'vocab', icon: 'compass', metric: 'learned', tiers: [25, 100, 500, 1000] },
	{ id: 'flame', title: 'Ngọn lửa', description: 'Chuỗi {n} ngày học', group: 'habit', icon: 'spark', metric: 'longestStreak', tiers: [3, 7, 30, 100] },
	{ id: 'on_time', title: 'Đúng hẹn', description: 'Đạt mục tiêu ngày {n} lần', group: 'habit', icon: 'target', metric: 'goalDays', tiers: [5, 30, 100, 365] },
	{ id: 'perfect_week', title: 'Tuần hoàn hảo', description: 'Mở {n} rương tuần', group: 'habit', icon: 'trophy', metric: 'chests', tiers: [1, 4, 12, 52] },
	{ id: 'perfect_score', title: 'Điểm tuyệt đối', description: '{n} bài kiểm tra đúng 100%', group: 'quiz', icon: 'sword', metric: 'perfectQuizzes', tiers: [1, 10, 50] },
	{ id: 'revival', title: 'Hồi sinh', description: '{n} từ từng quên đã lên lại hộp 3', group: 'mistakes', icon: 'shield', metric: 'revived', tiers: [10, 50, 200] },
	{ id: 'first_step', title: 'Bước đầu tiên', description: 'Hoàn thành phiên Ôn tập đầu tiên', group: 'start', icon: 'flag', metric: 'sessionsFinished', tiers: [1] },
	{ id: 'collector', title: 'Người sưu tầm', description: 'Theo học {n} bộ từ', group: 'start', icon: 'map', metric: 'enrolledSets', tiers: [3] },
	{ id: 'triple', title: 'Đủ bộ ba', description: 'Làm đủ {n} dạng kiểm tra trong một ngày', group: 'start', icon: 'star', metric: 'quizKindsToday', tiers: [3] },
];

export const TIER_NAMES = ['Đồng', 'Bạc', 'Vàng', 'Kim cương'] as const;

/** XP for reaching each tier: bronze, silver, gold, diamond. */
const TIER_XP = [20, 50, 100, 100] as const;

export function achievementKey(id: string, tier: number): string {
	return `${id}_${tier + 1}`;
}

export function achievementXp(tier: number): number {
	return TIER_XP[Math.max(0, Math.min(TIER_XP.length - 1, tier))]!;
}

export function describeAchievement(def: AchievementDef, tier: number): string {
	return def.description.replace('{n}', String(def.tiers[Math.min(tier, def.tiers.length - 1)]));
}

export type AchievementStatus = {
	def: AchievementDef;
	/** Tiers reached, 0 when locked. */
	reached: number;
	current: number;
	/** Target of the next tier, or null when every tier is reached. */
	next: number | null;
};

/**
 * Status of every achievement. `unlocked` keys stay unlocked even if a metric drops later
 * (for example a word falls out of long-term), so a learner never loses a badge.
 */
export function achievementStatus(metrics: LifetimeMetrics, unlocked: Set<string> = new Set()): AchievementStatus[] {
	return ACHIEVEMENTS.map((def) => {
		const current = metrics[def.metric];
		let reached = 0;
		def.tiers.forEach((target, tier) => {
			if (current >= target || unlocked.has(achievementKey(def.id, tier))) reached = tier + 1;
		});
		return { def, reached, current, next: def.tiers[reached] ?? null };
	});
}

/** Keys earned by these metrics that are not in `unlocked` yet, with the XP each one pays. */
export function newlyEarned(metrics: LifetimeMetrics, unlocked: Set<string>): Array<{ key: string; def: AchievementDef; tier: number; xp: number }> {
	return ACHIEVEMENTS.flatMap((def) => def.tiers.flatMap((target, tier) => {
		const key = achievementKey(def.id, tier);
		return metrics[def.metric] >= target && !unlocked.has(key) ? [{ key, def, tier, xp: achievementXp(tier) }] : [];
	}));
}

/** Locked achievements closest to their next tier, for the "Sắp đạt" row. */
export function nearestAchievements(statuses: AchievementStatus[], limit = 3): AchievementStatus[] {
	return statuses
		.filter((status) => status.next !== null && status.current > 0)
		.sort((a, b) => b.current / b.next! - a.current / a.next!)
		.slice(0, limit);
}

export function parseAchievementKey(key: string): { def: AchievementDef; tier: number } | null {
	const match = /^(.*)_(\d+)$/.exec(key);
	const def = match && ACHIEVEMENTS.find((entry) => entry.id === match[1]);
	return def && match ? { def, tier: Number(match[2]) - 1 } : null;
}
