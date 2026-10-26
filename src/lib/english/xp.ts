import { isLongTerm } from '@/lib/english/schedule';

/** XP rules. XP only comes from answers graded on the server, and every source pays once (see `sourceKey`). */
export const XP = {
	reviewCorrect: 2,
	reviewWrong: 1,
	newWord: 2,
	longTerm: 10,
	extra: 1,
	extraDailyCap: 20,
	quizPerPass: 1,
	quizBonus: 5,
	quizBonusRatio: 0.8,
	dailyQuest: 10,
	weeklyQuest: 40,
	weeklyChest: 50,
} as const;

export type XpKind = 'review' | 'new' | 'longterm' | 'extra' | 'quiz' | 'quest' | 'goal' | 'chest' | 'achievement';

export type XpEventInput = { sourceKey: string; kind: XpKind; xp: number };

export const DAILY_GOAL_TIERS = [
	{ xp: 20, label: 'Nhẹ nhàng', minutes: 5 },
	{ xp: 40, label: 'Đều đặn', minutes: 10 },
	{ xp: 70, label: 'Chăm chỉ', minutes: 15 },
	{ xp: 100, label: 'Chiến binh', minutes: 20 },
] as const;

export const DAILY_GOAL_DEFAULT = 40;

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

export type ReviewForXp = { id: string; senseId: string; correct: boolean; scheduled: boolean; boxBefore: number; boxAfter: number };

/**
 * XP for one Review answer. Honest misses still earn 1, so guessing never beats "I don't know".
 * Unscheduled answers (extra rounds, in-session retries) earn 1 when correct, up to a daily cap.
 */
export function reviewXpEvents(review: ReviewForXp, extraXpToday: number): XpEventInput[] {
	if (!review.scheduled) {
		return review.correct && extraXpToday < XP.extraDailyCap ? [{ sourceKey: `extra:${review.id}`, kind: 'extra', xp: XP.extra }] : [];
	}
	const events: XpEventInput[] = [{ sourceKey: `review:${review.id}`, kind: 'review', xp: review.correct ? XP.reviewCorrect : XP.reviewWrong }];
	if (review.boxBefore === 0) events.push({ sourceKey: `new:${review.senseId}`, kind: 'new', xp: XP.newWord });
	if (!isLongTerm(review.boxBefore) && isLongTerm(review.boxAfter)) events.push({ sourceKey: `longterm:${review.senseId}`, kind: 'longterm', xp: XP.longTerm });
	return events;
}

/** XP for a submitted quiz. Only the first submission of each kind on a day pays. */
export function quizXpEvent(kind: string, day: string, passed: number, total: number): XpEventInput | null {
	if (total <= 0) return null;
	const bonus = passed / total >= XP.quizBonusRatio ? XP.quizBonus : 0;
	const xp = passed * XP.quizPerPass + bonus;
	return xp > 0 ? { sourceKey: `quiz:${kind}:${day}`, kind: 'quiz', xp } : null;
}

const LEVEL_TITLES = ['Tân binh', 'Lữ khách', 'Hiệp sĩ chữ', 'Pháp sư từ', 'Hiền giả', 'Huyền thoại'] as const;

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
	return 100 + 50 * (Math.max(1, level) - 1);
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

/** Rough XP for finishing today's Review round, assuming most answers are right. */
export function estimateReviewXp(dueCount: number, newCount: number): number {
	return dueCount * XP.reviewCorrect + newCount * (XP.reviewCorrect + XP.newWord);
}
