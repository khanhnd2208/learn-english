import { describe, expect, it } from 'vitest';
import { isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';

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
});
