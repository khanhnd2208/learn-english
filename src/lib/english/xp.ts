import { isLongTerm } from '@/lib/english/schedule';

/**
 * XP rules. XP only comes from answers graded on the server, and every source pays once (see `sourceKey`).
 * Wrong answers never cost XP. Practice (Luyện tập) pays no XP: it does not change the schedule.
 */
export const XP = {
	/** Ôn luân phiên: a word due today, answered right. */
	srs: 20,
	/** A word reaching the Nhớ lâu stage for the first time. */
	longTerm: 100,
	/** Ôn luân phiên: an extra answer that does not move the schedule, answered right. */
	extra: 10,
	/** Ôn theo bộ: a main question answered right. */
	review: 10,
	/** Daily cap shared by Ôn theo bộ and extra answers in Ôn luân phiên. */
	reviewDailyCap: 300,
	dailyQuest: 100,
	dailyGoal: 100,
	weeklyChest: 500,
	/** Minimum gap between two XP-earning answers in one session. */
	minGapMs: 3000,
} as const;

/** `extra` covers Ôn theo bộ too, since both share the daily cap. */
export type XpKind = 'review' | 'longterm' | 'extra' | 'quest' | 'goal' | 'chest' | 'achievement';

export type XpEventInput = { sourceKey: string; kind: XpKind; xp: number };

export const DAILY_GOAL_TIERS = [
	{ xp: 200, label: 'Nhẹ nhàng' },
	{ xp: 400, label: 'Đều đặn' },
	{ xp: 700, label: 'Chăm chỉ' },
	{ xp: 1000, label: 'Chiến binh' },
] as const;

export const DAILY_GOAL_DEFAULT = 400;

export function isDailyGoalXp(value: number): boolean {
	return DAILY_GOAL_TIERS.some((tier) => tier.xp === value);
}

/** Index of the tier closest to a stored goal, 0 (light) to 3 (warrior). */
export function goalTierIndex(goalXp: number): number {
	let best = 0;
	DAILY_GOAL_TIERS.forEach((tier, index) => {
		if (Math.abs(tier.xp - goalXp) < Math.abs(DAILY_GOAL_TIERS[best]!.xp - goalXp)) best = index;
	});
	return best;
}

/** Anti-spam: an answer earns XP only when it comes `minGapMs` after the previous one, by server time. */
export function pacedEnough(prevAt: Date, at: Date, minGapMs: number = XP.minGapMs): boolean {
	return at.getTime() - prevAt.getTime() >= minGapMs;
}

export type ReviewForXp = { id: string; senseId: string; correct: boolean; scheduled: boolean; boxBefore: number; boxAfter: number };

/**
 * XP for one SRS answer. Wrong answers and answers that come too fast earn nothing.
 * Unscheduled answers (extra rounds, in-session retries) earn less, up to the shared daily cap.
 */
export function reviewXpEvents(review: ReviewForXp, extraXpToday: number, paced: boolean): XpEventInput[] {
	if (!review.correct || !paced) return [];
	if (!review.scheduled) {
		return extraXpToday + XP.extra <= XP.reviewDailyCap ? [{ sourceKey: `extra:${review.id}`, kind: 'extra', xp: XP.extra }] : [];
	}
	const events: XpEventInput[] = [{ sourceKey: `review:${review.id}`, kind: 'review', xp: XP.srs }];
	if (!isLongTerm(review.boxBefore) && isLongTerm(review.boxAfter)) events.push({ sourceKey: `longterm:${review.senseId}`, kind: 'longterm', xp: XP.longTerm });
	return events;
}

const LEVEL_TITLES = ['Tân binh', 'Lữ khách', 'Hiệp sĩ chữ', 'Pháp sư từ', 'Hiền giả', 'Huyền thoại'] as const;

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
	return 800 + 600 * (Math.max(1, level) - 1);
}

export type LevelInfo = { level: number; title: string; total: number; intoLevel: number; toNext: number; levelSize: number };

export function levelFromXp(total: number): LevelInfo {
	let level = 1;
	let remaining = Math.max(0, Math.trunc(total));
	while (remaining >= xpForLevel(level)) {
		remaining -= xpForLevel(level);
		level += 1;
	}
	const levelSize = xpForLevel(level);
	return {
		level,
		title: LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 5))]!,
		total: Math.max(0, Math.trunc(total)),
		intoLevel: remaining,
		toNext: levelSize - remaining,
		levelSize,
	};
}

/** Rough XP for finishing today's SRS round, assuming most answers are right. */
export function estimateReviewXp(dueCount: number, newCount: number): number {
	return (dueCount + newCount) * XP.srs;
}
