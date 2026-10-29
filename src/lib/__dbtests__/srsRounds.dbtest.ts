import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { resetEnTables } from './setup';
import { seedWorld } from '../../../scripts/lib/load-world';
import { startToday, answerToday, finishToday } from '@/services/english/enDailyService';

test('continues through more than 250 answers in fresh rounds without repeating scheduled words', async () => {
	await resetEnTables(prisma);
	const now = new Date('2026-10-30T01:00:00Z');
	const world = await seedWorld(prisma, { users: 1, sets: 1, words: 350, days: 0, seed: 42, now, guidedSessions: 0 });
	const user = world.userIds[0]!;
	await prisma.enWordState.deleteMany({ where: { userId: user } });
	const seen = new Set<string>();
	let clock = now.getTime();
	for (let round = 0; round < 7; round++) {
		const session = await startToday(user, new Date(clock));
		expect(session.items).toHaveLength(50);
		for (const item of session.items) {
			expect(seen.has(item.senseId)).toBe(false);
			seen.add(item.senseId);
			clock += 4000;
			await answerToday(user, { sessionId: session.sessionId!, senseId: item.senseId, answer: item.bundle.word.lemma }, new Date(clock));
		}
		const result = await finishToday(user, session.sessionId!, new Date(clock));
		expect(result.remaining).toBe(350 - seen.size);
	}
	expect(seen.size).toBe(350);
	expect((await startToday(user, new Date(clock))).items).toEqual([]);
}, 120_000);
