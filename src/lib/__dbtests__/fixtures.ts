import { prisma } from '@/lib/prisma';
import { seedWorld } from '../../../scripts/lib/load-world';
import { resetEnTables } from './setup';

export async function seedSmallWorld(seed: number) {
	await resetEnTables(prisma);
	const world = await seedWorld(prisma, { users: 4, sets: 3, words: 40, days: 12, seed, now: new Date('2026-10-29T16:59:59Z'), guidedSessions: 2 });
	await prisma.enSetItem.createMany({ data: [{ setId: world.setIds[1]!, senseId: world.senseIds[0]!, position: 40 }, { setId: world.setIds[0]!, senseId: world.senseIds[0]!, position: 41 }, { setId: world.setIds[0]!, senseId: null, position: 42 }] });
	await prisma.enSet.update({ where: { id: world.setIds[1]! }, data: { status: 'draft' } });
	await prisma.enSet.update({ where: { id: world.setIds[2]! }, data: { status: 'suspended' } });
	await prisma.enSense.update({ where: { id: world.senseIds[1]! }, data: { status: 'draft' } });
	await prisma.enEnrollment.deleteMany({ where: { userId: world.userIds[0]!, setId: world.setIds[2]! } });
	await prisma.enWordState.upsert({ where: { userId_senseId: { userId: world.userIds[0]!, senseId: world.senseIds[0]! } }, create: { userId: world.userIds[0]!, senseId: world.senseIds[0]!, box: 1, dueAt: new Date('2026-10-29T17:00:00Z') }, update: { box: 1, dueAt: new Date('2026-10-29T17:00:00Z'), lastReviewedAt: null } });
	await prisma.enWordState.upsert({ where: { userId_senseId: { userId: world.userIds[0]!, senseId: world.senseIds[2]! } }, create: { userId: world.userIds[0]!, senseId: world.senseIds[2]!, box: 0 }, update: { box: 0 } });
	await prisma.enReview.createMany({ data: ['2026-10-29T16:59:59Z', '2026-10-29T17:00:00Z'].map((at) => ({ userId: world.userIds[0]!, senseId: world.senseIds[0]!, sessionId: 'boundary', at: new Date(at), correct: true, prompt: 'free', boxBefore: 1, boxAfter: 2 })) });
	await prisma.enGuidedReviewQuestion.update({ where: { id: `${world.userIds[0]}-guided-0-q-0` }, data: { answer: null, answeredAt: null, correct: null } });
	return world;
}
