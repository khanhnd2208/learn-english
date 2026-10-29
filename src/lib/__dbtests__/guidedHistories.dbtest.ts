import { expect, test } from 'vitest';
import { seedSmallWorld } from './fixtures';
import { histories } from '@/services/english/enGuidedReviewService';
import { histories as legacyHistories } from './legacy/guided';

for (const seed of [1,2,3,4,5]) test(`guided SQL keeps the first attempt per session and the latest 20 per sense, seed ${seed}`, async () => {
	const { userIds, senseIds } = await seedSmallWorld(seed);
	for (const user of userIds) expect(await histories(user, [...senseIds, 'unknown'])).toEqual(await legacyHistories(user, [...senseIds, 'unknown']));
});
