/** Rough minutes for a Review round: about 10 s per review and 35 s per new word. */
export function reviewMinutes(overview: { dueCount: number; newCount: number }): number {
	return Math.max(1, Math.round((overview.dueCount * 10 + overview.newCount * 35) / 60));
}

type ReviewCounts = { dueTotal: number; newCount: number; enrolledSets: number; learnedCount: number };

/** Review counts as today's task once nothing is due and no new word is waiting, but only for a learner who has words. */
export function isReviewDone(overview: ReviewCounts): boolean {
	return overview.dueTotal === 0 && overview.newCount === 0 && (overview.enrolledSets > 0 || overview.learnedCount > 0);
}
