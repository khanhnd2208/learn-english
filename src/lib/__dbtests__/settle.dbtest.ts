import { expect, test } from 'vitest';
import { seedSmallWorld } from './fixtures';
import { loadRewardState, pendingRewards } from '@/services/english/enGoalService';
import { loadState as legacyLoadState, pendingRewards as legacyPendingRewards } from './legacy/goals';

for (const seed of [1, 2, 3, 4, 5]) test(`reward state and pending payments preserve legacy results, seed ${seed}`, async () => {
	const { userIds } = await seedSmallWorld(seed);
	for (const user of userIds) for (const at of ['2026-10-29T16:59:59Z', '2026-10-29T17:00:00Z']) {
		const now = new Date(at);
		const legacy = await legacyLoadState(user, now);
		const actual = await loadRewardState(user, now);
		for (const key of ['daily', 'weekly', 'dayMetrics', 'weekMetrics', 'claimed', 'lifetime', 'totalXp', 'achievements'] as const) expect(actual[key]).toEqual(legacy[key]);
		expect(pendingRewards(actual)).toEqual(legacyPendingRewards(legacy));
	}
});
