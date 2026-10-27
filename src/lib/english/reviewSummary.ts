/** SRS questions are short checks, averaging about 12 seconds each. Zero when nothing is waiting. */
export function reviewMinutes(overview: { dueCount: number; newCount: number }): number {
	const questions = overview.dueCount + overview.newCount;
	return questions > 0 ? Math.max(1, Math.round((questions * 12) / 60)) : 0;
}

type ReviewCounts = { dueTotal: number; newCount: number; enrolledSets: number; learnedCount: number };

/** Review counts as today's task once nothing is due and no new word is waiting, but only for a learner who has words. */
export function isReviewDone(overview: ReviewCounts): boolean {
	return overview.dueTotal === 0 && overview.newCount === 0 && (overview.enrolledSets > 0 || overview.learnedCount > 0);
}

/**
 * Due words in this round, said the same way everywhere. A round holds at most
 * EN_ROUND_REVIEW_LIMIT words, so a large backlog reads "30/45" instead of two numbers that disagree.
 */
export function dueRoundLabel(overview: { dueCount: number; dueTotal: number }): string {
	if (overview.dueTotal > overview.dueCount) return `${overview.dueCount}/${overview.dueTotal} từ đến hạn trong lượt này`;
	return `${overview.dueCount} từ đến hạn`;
}
