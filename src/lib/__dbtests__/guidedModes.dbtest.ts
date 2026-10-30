import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { seedSmallWorld } from './fixtures';
import { getGuidedReviewOverview, startGuidedReview } from '@/services/english/enGuidedReviewService';

test('fixed guided mode persists on the session and never writes SRS progress', async () => {
 const world = await seedSmallWorld(42);
 const userId = world.userIds[0]!;
 const overview = await getGuidedReviewOverview(userId);
 if (!overview.sets.length) throw new Error('Fixture has no enrolled sets');
 const beforeStates = await prisma.enWordState.count({ where: { userId } });
 const beforeReviews = await prisma.enReview.count({ where: { userId } });
 const started = await startGuidedReview(userId, [overview.sets[0]!.id], 'listen_type');
 expect(started.questionMode).toBe('listen_type');
 expect(started.questions.every((question) => question.activityKey === 'listen_type')).toBe(true);
 expect(started.words.length).toBeLessThanOrEqual(5);
 expect(await prisma.enWordState.count({ where: { userId } })).toBe(beforeStates);
 expect(await prisma.enReview.count({ where: { userId } })).toBe(beforeReviews);
});
