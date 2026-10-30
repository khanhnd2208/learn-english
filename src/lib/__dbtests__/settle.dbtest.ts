import { expect, test } from 'vitest';
import { seedSmallWorld } from './fixtures';
import { computeGoalBoard, loadRewardState, pendingRewards, totalXpOf } from '@/services/english/enGoalService';
import { getGoalBoard as legacyGetGoalBoard, loadState as legacyLoadState, pendingRewards as legacyPendingRewards } from './legacy/goals';
import { REWARD_XP_KINDS } from '@/lib/english/xp';

for (const seed of [1, 2, 3, 4, 5]) test(`reward state and pending payments preserve legacy results, seed ${seed}`, async () => {
	const { userIds } = await seedSmallWorld(seed);
	for (const user of userIds) for (const at of ['2026-10-29T16:59:59Z', '2026-10-29T17:00:00Z']) {
		const now = new Date(at);
		const legacy = await legacyLoadState(user, now);
		const actual = await loadRewardState(user, now);
		for (const key of ['daily', 'weekly', 'dayMetrics', 'weekMetrics', 'lifetime', 'achievements'] as const) expect(actual[key]).toEqual(legacy[key]);
		expect(actual.claimed).toEqual(new Set(legacy.xpRows.filter((row) => (REWARD_XP_KINDS as readonly string[]).includes(row.kind)).map((row) => row.sourceKey)));
		expect(await totalXpOf(user)).toEqual(legacy.totalXp);
		expect(pendingRewards(actual)).toEqual(legacyPendingRewards(legacy));
	}
});

for (const seed of [1, 2, 3]) test(`board XP by day, goal days and level match legacy, seed ${seed}`, async () => {
	const { userIds } = await seedSmallWorld(seed);
	for (const user of userIds) for (const at of ['2026-10-29T16:59:59Z', '2026-10-29T17:00:00Z']) {
		const now = new Date(at);
		const legacy = await legacyGetGoalBoard(user, now);
		const actual = await computeGoalBoard(user, now);
		expect(actual.level).toEqual(legacy.level);
		expect(actual.today.xp).toEqual(legacy.today.xp);
		expect(actual.week.days).toEqual(legacy.week.days);
		expect(actual.week.chestOpened).toEqual(legacy.week.chestOpened);
	}
});
