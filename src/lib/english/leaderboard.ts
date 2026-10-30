export type LeaderboardPeriod = 'week' | 'all';

export const LEADERBOARD_PERIODS = ['week', 'all'] as const;
export const LEADERBOARD_SIZE = 50;
export const ACTIVE_WINDOW_MS = 10 * 60_000;
export const FALLBACK_NAME = 'Học viên';

export type Score = { userId: string; xp: number };
export type RankedScore = Score & { rank: number };

/** Drops xp <= 0, sorts by xp desc then userId asc, gives standard competition ranks (1, 1, 3). */
export function rankScores(scores: Score[]): RankedScore[] {
	const sorted = scores
		.filter((score) => score.xp > 0)
		.sort((left, right) => right.xp - left.xp || left.userId.localeCompare(right.userId));
	let rank = 0;
	let previousXp: number | null = null;
	return sorted.map((score, index) => {
		if (score.xp !== previousXp) rank = index + 1;
		previousXp = score.xp;
		return { ...score, rank };
	});
}

/** True when lastAt is within ACTIVE_WINDOW_MS before now (inclusive). Null → false. A lastAt after now → true. */
export function isActive(lastAt: Date | null, now: Date): boolean {
	return lastAt !== null && lastAt.getTime() >= now.getTime() - ACTIVE_WINDOW_MS;
}

/** Trim, collapse whitespace, cut to 40 chars; empty/null → FALLBACK_NAME. */
export function displayName(name: string | null | undefined): string {
	const clean = name?.trim().replace(/\s+/g, ' ').slice(0, 40) ?? '';
	return clean || FALLBACK_NAME;
}

/** Uploaded avatar wins; then an https account image; otherwise no image. */
export function avatarUrl(
	userId: string,
	upload: { file: string | null; version: number } | null,
	image: string | null | undefined,
): string | null {
	if (upload?.file) return `/api/avatar/${userId}?v=${upload.version}`;
	return image?.startsWith('https://') ? image : null;
}

/** Visual podium order from ranked rows: second, first, third. */
export function podiumOrder<T>(top: T[]): T[] {
	if (top.length <= 1) return top.slice(0, 1);
	return [top[1]!, top[0]!, ...top.slice(2, 3)];
}
