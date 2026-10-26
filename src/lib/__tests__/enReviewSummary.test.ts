import { describe, expect, it } from 'vitest';
import { completedDailyTasks, isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';

describe('daily task summary', () => {
	const base = { dueTotal: 0, newCount: 0, enrolledSets: 1, learnedCount: 5 };

	it('does not count Review as done for a learner with no words yet', () => {
		expect(isReviewDone({ ...base, enrolledSets: 0, learnedCount: 0 })).toBe(false);
		expect(completedDailyTasks({ ...base, enrolledSets: 0, learnedCount: 0 }, {})).toBe(0);
	});

	it('counts Review plus each finished quiz kind', () => {
		expect(completedDailyTasks(base, { mcq: {}, listen: {} })).toBe(3);
		expect(completedDailyTasks({ ...base, dueTotal: 4 }, { mcq: {} })).toBe(1);
	});

	it('estimates minutes from reviews and new words', () => {
		expect(reviewMinutes({ dueCount: 30, newCount: 10 })).toBe(11);
		expect(reviewMinutes({ dueCount: 0, newCount: 0 })).toBe(1);
	});
});
