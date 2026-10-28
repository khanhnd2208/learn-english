import { isReviewDone } from '@/lib/english/reviewSummary';

export type TodayHeroState = 'start' | 'review' | 'more' | 'goal';

/**
 * The one thing the home page asks for: pick a first set, do today's review, learn more,
 * or rest once the daily goal is met. Review always wins while words are waiting.
 */
export function todayHeroState(input: {
	enrolledSets: number;
	learnedCount: number;
	dueTotal: number;
	dueCount: number;
	newCount: number;
	xp: number;
	goal: number;
}): TodayHeroState {
	if (input.enrolledSets === 0) return 'start';
	if (!isReviewDone(input) && input.dueCount + input.newCount > 0) return 'review';
	return input.goal > 0 && input.xp >= input.goal ? 'goal' : 'more';
}
