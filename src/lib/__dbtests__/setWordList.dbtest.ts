import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { seedSmallWorld } from './fixtures';
import { getEnrolledSetWords } from '@/services/english/enCatalogService';

test('set word list is enrolled, published, ordered and read only', async () => {
 const world = await seedSmallWorld(41);
 const userId = world.userIds[0]!;
 const setId = world.setIds[0]!;
 await prisma.enEnrollment.upsert({ where: { userId_setId: { userId, setId } }, create: { userId, setId }, update: {} });
 const before = await prisma.enXpEvent.count({ where: { userId } });
 const result = await getEnrolledSetWords(userId, setId);
 expect(result.id).toBe(setId);
 expect(result.words.map((word) => word.senseId)).toEqual([...new Set(result.words.map((word) => word.senseId))]);
 expect(result.words.every((word) => Object.keys(word).sort().join(',') === 'ipa,lemma,meaningVi,partOfSpeech,recordedAudioAvailable,senseId')).toBe(true);
 expect(await prisma.enXpEvent.count({ where: { userId } })).toBe(before);
 await expect(getEnrolledSetWords('other-user', setId)).rejects.toMatchObject({ status: 404 });
 await expect(getEnrolledSetWords(userId, world.setIds[1]!)).rejects.toMatchObject({ status: 404 });
});
