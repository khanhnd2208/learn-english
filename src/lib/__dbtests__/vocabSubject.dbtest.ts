import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { seedSmallWorld } from './fixtures';
import { enrollVocabSubject, leaveVocabSubject, listVocabSubjects, syncSubjectEnrollments } from '@/services/english/enVocabSubjectService'
import { publishEnglishSet, saveEnglishPack } from '@/services/english/enContentService';
import { sampleEnglishPack } from '@/lib/english/samplePack';

test('subject enrollment includes published sets and preserves word state on leave', async () => {
  const world = await seedSmallWorld(51);
  const userId = world.userIds[0]!;
  const subject = await prisma.enVocabSubject.create({ data: { title: 'Test subject', status: 'published' } });
  for (const [index, setId] of world.setIds.entries()) await prisma.enSet.update({ where: { id: setId }, data: { subjectId: subject.id, status: index === 2 ? 'published' : index === 1 ? 'draft' : 'published' } });
  await prisma.enEnrollment.deleteMany({ where: { userId, setId: { in: world.setIds } } });
  await enrollVocabSubject(userId, subject.id);
  expect(await prisma.enEnrollment.count({ where: { userId, setId: { in: world.setIds } } })).toBe(2);
  await prisma.enSet.update({ where: { id: world.setIds[1]! }, data: { status: 'published' } });
  await prisma.$transaction((tx) => syncSubjectEnrollments(tx, subject.id));
  expect(await prisma.enEnrollment.count({ where: { userId, setId: { in: world.setIds } } })).toBe(3);
  const before = await prisma.enWordState.count({ where: { userId } });
  await leaveVocabSubject(userId, subject.id);
  expect(await prisma.enEnrollment.count({ where: { userId, setId: { in: world.setIds } } })).toBe(0);
  expect(await prisma.enWordState.count({ where: { userId } })).toBe(before);
});

test('hidden subjects remain visible to learners already enrolled', async () => {
  const world = await seedSmallWorld(52);
  const userId = world.userIds[0]!;
  const subject = await prisma.enVocabSubject.create({ data: { title: 'Hidden', status: 'published', listed: false } });
  await prisma.enSet.update({ where: { id: world.setIds[0]! }, data: { subjectId: subject.id } });
  expect((await listVocabSubjects(userId, false)).some((row) => row.id === subject.id)).toBe(false);
  await prisma.enVocabSubjectEnrollment.create({ data: { userId, subjectId: subject.id } });
  expect((await listVocabSubjects(userId, false)).some((row) => row.id === subject.id)).toBe(true);
});

test('publishing a set of a subject enrolls learners who already joined it', async () => {
  const world = await seedSmallWorld(53);
  const userId = world.userIds[0]!;
  const { setId } = await saveEnglishPack(sampleEnglishPack);
  const subject = await prisma.enVocabSubject.create({ data: { title: 'Open', status: 'published' } });
  await prisma.enSet.update({ where: { id: setId }, data: { subjectId: subject.id } });
  await prisma.enVocabSubjectEnrollment.create({ data: { userId, subjectId: subject.id } });
  expect(await prisma.enEnrollment.count({ where: { userId, setId } })).toBe(0);
  await publishEnglishSet(setId, async () => true);
  expect(await prisma.enEnrollment.count({ where: { userId, setId } })).toBe(1);
});
