import { describe, expect, it } from 'vitest';
import { isReviewDone, reviewMinutes, srsTodayPreview } from '@/lib/english/reviewSummary';
import { XP } from '@/lib/english/xp';

describe('review summary', () => {
	const base = { dueTotal: 0, newCount: 0, enrolledSets: 1, learnedCount: 5 };

	it('does not count Review as done for a learner with no words yet', () => {
		expect(isReviewDone({ ...base, enrolledSets: 0, learnedCount: 0 })).toBe(false);
		expect(isReviewDone(base)).toBe(true);
		expect(isReviewDone({ ...base, dueTotal: 4 })).toBe(false);
	});

	it('estimates minutes from reviews and new words', () => {
		expect(reviewMinutes({ dueCount: 30, newCount: 10 })).toBe(8);
		expect(reviewMinutes({ dueCount: 1, newCount: 0 })).toBe(1);
		expect(reviewMinutes({ dueCount: 0, newCount: 0 })).toBe(0);
	});

	it('previews the full queue but only one bounded SRS round', () => {
		expect(srsTodayPreview({ dueCount: 30, newCount: 10 })).toEqual({ total: 40, round: 40, minutes: 8, xp: 40 * XP.srs });
		expect(srsTodayPreview({ dueCount: 120, newCount: 300 })).toEqual({ total: 420, round: 50, minutes: 10, xp: 50 * XP.srs });
		expect(srsTodayPreview({ dueCount: 0, newCount: 0 })).toEqual({ total: 0, round: 0, minutes: 0, xp: 0 });
	});
});
