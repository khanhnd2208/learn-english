import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { seedSmallWorld } from './fixtures';

test('seedSmallWorld provides shared words, hidden content, unenrollment and Vietnam boundaries', async () => {
	const world = await seedSmallWorld(42);
	expect(await prisma.enSet.count()).toBe(3);
	expect(await prisma.enSense.count()).toBe(120);
	expect(await prisma.enExample.count()).toBe(480);
	expect(await prisma.enLearnerProfile.count()).toBe(4);
	expect(await prisma.enSetItem.count({ where: { senseId: world.senseIds[0] } })).toBe(3);
	expect(await prisma.enGuidedReviewQuestion.count({ where: { answeredAt: null } })).toBe(1);
	expect(await prisma.enWordState.count({ where: { userId: world.userIds[0], sense: { setItems: { some: { setId: world.setIds[2] } } } } })).toBeGreaterThan(0);
});
