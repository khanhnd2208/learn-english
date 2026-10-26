import type { Rng } from '@/lib/english/activities/rng';

export interface ReviewCandidate {
	senseId: string;
	inMistakeBook: boolean;
	mistakeAddedAt: Date | null;
	lastExposureAt: Date | null;
}

function byTime(a: Date | null, b: Date | null): number {
	return (a?.getTime() ?? 0) - (b?.getTime() ?? 0);
}

/** Mistake book first, then words unseen the longest, then a random fill. */
export function pickReviewSenses(states: ReviewCandidate[], count: number, rng: Rng): ReviewCandidate[] {
	if (count <= 0) return [];
	const picked = new Set<string>();
	const result: ReviewCandidate[] = [];
	const take = (row: ReviewCandidate) => {
		if (picked.has(row.senseId) || result.length >= count) return;
		picked.add(row.senseId);
		result.push(row);
	};
	const mistakes = states
		.filter((row) => row.inMistakeBook)
		.sort((a, b) => byTime(a.mistakeAddedAt, b.mistakeAddedAt));
	for (const row of mistakes) take(row);
	const stale = states
		.filter((row) => !picked.has(row.senseId) && row.lastExposureAt)
		.sort((a, b) => byTime(a.lastExposureAt, b.lastExposureAt));
	for (const row of stale) take(row);
	for (const row of rng.shuffle(states.filter((item) => !picked.has(item.senseId)))) take(row);
	return result;
}
