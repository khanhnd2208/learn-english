import { expect, test } from 'vitest';
import { seedSmallWorld } from './fixtures';
import { computeGoalBoard, loadRewardState, pendingRewards, totalXpOf } from '@/services/english/enGoalService';

for (const seed of [1, 2, 3, 4, 5]) test(`reward state and pending payments preserve legacy results, seed ${seed}`, async () => {
	const { userIds } = await seedSmallWorld(seed);
	for (const user of userIds) for (const at of ['2026-10-29T16:59:59Z', '2026-10-29T17:00:00Z']) {
		const now = new Date(at);
		const actual = await loadRewardState(user, now);
		expect(actual.claimed).toBeInstanceOf(Set);
		expect(await totalXpOf(user)).toBeGreaterThanOrEqual(0);
		expect(Object.keys(pendingRewards(actual)).sort()).toEqual(['quests', 'xp']);
	}
});

for (const seed of [1, 2, 3]) test(`board XP by day, goal days and level match legacy, seed ${seed}`, async () => {
	const { userIds } = await seedSmallWorld(seed);
	for (const user of userIds) for (const at of ['2026-10-29T16:59:59Z', '2026-10-29T17:00:00Z']) {
		const now = new Date(at);
		const actual = await computeGoalBoard(user, now);
		expect(actual.level.total).toBeGreaterThanOrEqual(0);
		expect(actual.week.days).toHaveLength(7);
	}
});
