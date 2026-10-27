import { vnDayKey } from '@/lib/english/gapRule';
import { emptyMetrics, type QuestMetrics } from '@/lib/english/quests';
import { isLongTerm } from '@/lib/english/schedule';

export type ReviewRow = { sessionId: string; senseId: string; at: Date; correct: boolean; scheduled: boolean; boxBefore: number; boxAfter: number; practice?: boolean };
export type XpRow = { day: string; xp: number; kind: string; sourceKey: string };
export type QuizRow = { kind: string; passedCount: number; wordCount: number; finishedAt: Date };

export const QUIZ_PASS_RATIO = 0.7;

/** Longest run of correct answers inside one Review session, retries included. */
export function bestCombo(reviews: ReviewRow[]): number {
	const runs = new Map<string, number>();
	let best = 0;
	for (const review of [...reviews].sort((a, b) => a.at.getTime() - b.at.getTime())) {
		const run = review.correct ? (runs.get(review.sessionId) ?? 0) + 1 : 0;
		runs.set(review.sessionId, run);
		best = Math.max(best, run);
	}
	return best;
}

/** Quest metrics for a set of Vietnam days, from rows already loaded for the week. */
export function periodMetrics(input: {
	days: Set<string>;
	reviews: ReviewRow[];
	xp: XpRow[];
	quizzes: QuizRow[];
	/** Senses the learner has forgotten at least once. */
	lapsedSenses: Set<string>;
	dueRemaining: number;
}): QuestMetrics {
	const metrics = emptyMetrics();
	const reviews = input.reviews.filter((review) => input.days.has(vnDayKey(review.at)));
	const scheduled = reviews.filter((review) => review.scheduled);
	const distinct = (rows: ReviewRow[]) => new Set(rows.map((row) => row.senseId)).size;
	metrics.correctReviews = reviews.filter((review) => review.correct && (review.practice || (review.scheduled && review.boxBefore > 0))).length;
	metrics.newWords = distinct(scheduled.filter((review) => review.boxBefore === 0));
	metrics.rescued = distinct(scheduled.filter((review) => review.correct && review.boxBefore > 0 && input.lapsedSenses.has(review.senseId)));
	metrics.longTermGained = distinct(scheduled.filter((review) => !isLongTerm(review.boxBefore) && isLongTerm(review.boxAfter)));
	metrics.bestCombo = bestCombo(reviews);
	metrics.daysStudied = new Set(reviews.map((review) => vnDayKey(review.at))).size;
	const xp = input.xp.filter((row) => input.days.has(row.day));
	metrics.xp = xp.reduce((sum, row) => sum + row.xp, 0);
	metrics.goalDays = new Set(xp.filter((row) => row.kind === 'goal').map((row) => row.day)).size;
	const quizzes = input.quizzes.filter((quiz) => input.days.has(vnDayKey(quiz.finishedAt)));
	metrics.quizzesPassed = quizzes.filter((quiz) => quiz.wordCount > 0 && quiz.passedCount / quiz.wordCount >= QUIZ_PASS_RATIO).length;
	metrics.quizKinds = new Set(quizzes.map((quiz) => quiz.kind)).size;
	metrics.dueRemaining = input.dueRemaining;
	return metrics;
}
