import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { resetEnTables } from './setup';
import { buildTestWorkbook } from '@/services/english/enTestWorkbookService';
import { deleteTestPaper, finishTestPaper, getTestPaperForLearner, listMyTestResults, reorderTestPapers, saveTestPaper, startTestPaper } from '@/services/english/enTestService';
import type { TestQuestionInput } from '@/lib/english/testPaper';

const one: TestQuestionInput[] = [{ type: 'mcq', prompt: 'Pick one.', options: ['no', 'yes'], correctIndex: 1, explanationVi: '' }];
const two: TestQuestionInput[] = [...one, { type: 'fill', prompt: 'A ___ B.', answers: ['and'], explanationVi: '' }];
const file = async (questions: TestQuestionInput[]) => { const buffer = await buildTestWorkbook(questions); return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer; };
async function world() {
  await resetEnTables(prisma);
  const subject = await prisma.enTestSubject.create({ data: { title: 'Test', status: 'published' } });
  const paper = await saveTestPaper({ subjectId: subject.id, title: 'Paper', description: '', data: await file(one), publish: true });
  await prisma.enTestSubjectEnrollment.create({ data: { userId: 'learner', subjectId: subject.id } });
  return { subject, paper };
}

test('two concurrent starts create only one active attempt', async () => {
  const { paper } = await world();
  const results = await Promise.all([startTestPaper('learner', paper.id, false), startTestPaper('learner', paper.id, false)]);
  expect(results[0].id).toBe(results[1].id);
  expect(await prisma.enTestPaperAttempt.count({ where: { userId: 'learner', paperId: paper.id, status: 'in_progress' } })).toBe(1);
});
test('replacing a paper preserves an active attempt snapshot', async () => {
  const { subject, paper } = await world();
  const active = await startTestPaper('learner', paper.id, false);
  await saveTestPaper({ subjectId: subject.id, title: 'Paper', description: '', data: await file(two), publish: true, paperId: paper.id });
  const old = await prisma.enTestPaperAttempt.findUniqueOrThrow({ where: { id: active.id }, include: { items: true } });
  expect(old.items).toHaveLength(1);
  expect(old.items[0]?.prompt).toBe('Pick one.');
  await finishTestPaper('learner', active.id);
  expect((await startTestPaper('learner', paper.id, false)).items).toHaveLength(2);
});
test('finishing writes no learning data', async () => {
  const { paper } = await world();
  const counts = async () => Promise.all([prisma.enXpEvent.count(), prisma.enWordState.count(), prisma.enReview.count(), prisma.enStudyDay.count()]);
  const before = await counts();
  const attempt = await startTestPaper('learner', paper.id, false);
  await finishTestPaper('learner', attempt.id);
  expect(await counts()).toEqual(before);
});
test('lists only my results, newest first', async () => {
  const { paper } = await world();
  for (const userId of ['learner', 'learner', 'other']) {
    await prisma.enTestSubjectEnrollment.upsert({ where: { userId_subjectId: { userId, subjectId: paper.subjectId } }, create: { userId, subjectId: paper.subjectId }, update: {} });
    const attempt = await startTestPaper(userId, paper.id, false);
    await finishTestPaper(userId, attempt.id);
  }
  const rows = await listMyTestResults('learner');
  expect(rows).toHaveLength(2);
  const dates = await prisma.enTestPaperAttempt.findMany({ where: { id: { in: rows.map((row) => row.attemptId) } }, orderBy: { finishedAt: 'desc' }, select: { id: true } });
  expect(rows.map((row) => row.attemptId)).toEqual(dates.map((row) => row.id));
});
test('deleting a paper removes its attempts', async () => {
  const { paper } = await world();
  const attempt = await startTestPaper('learner', paper.id, false);
  await deleteTestPaper(paper.id);
  expect(await prisma.enTestPaperAttempt.count({ where: { id: attempt.id } })).toBe(0);
});
test('reordering moves a paper to another course and is repeatable', async () => {
  const { subject, paper } = await world();
  const other = await prisma.enTestSubject.create({ data: { title: 'Other', status: 'published' } });
  const second = await saveTestPaper({ subjectId: subject.id, title: 'Second', description: '', data: await file(one), publish: true });
  const columns = [{ subjectId: subject.id, paperIds: [second.id] }, { subjectId: other.id, paperIds: [paper.id] }];
  for (let run = 0; run < 2; run++) {
    await reorderTestPapers(columns);
    expect(await prisma.enTestPaper.findUniqueOrThrow({ where: { id: paper.id } })).toMatchObject({ subjectId: other.id, sortOrder: 0 });
    expect(await prisma.enTestPaper.findUniqueOrThrow({ where: { id: second.id } })).toMatchObject({ subjectId: subject.id, sortOrder: 0 });
  }
});
test('a bank question shared by two papers survives deleting one paper', async () => {
  const { subject, paper } = await world();
  const entry = await prisma.enTestPaperEntry.findFirstOrThrow({ where: { paperId: paper.id } });
  const second = await saveTestPaper({ subjectId: subject.id, title: 'Second', description: '', data: await file(one), publish: true });
  await prisma.enTestPaperEntry.deleteMany({ where: { paperId: second.id } });
  await prisma.enTestPaperEntry.create({ data: { paperId: second.id, questionId: entry.questionId, position: 0 } });
  await deleteTestPaper(paper.id);
  expect(await prisma.enTestQuestion.count({ where: { id: entry.questionId } })).toBe(1);
  expect(await prisma.enTestPaperEntry.count({ where: { paperId: second.id } })).toBe(1);
});
test('a bank question in use cannot be deleted', async () => {
  const { paper } = await world();
  const entry = await prisma.enTestPaperEntry.findFirstOrThrow({ where: { paperId: paper.id } });
  await expect(prisma.enTestQuestion.delete({ where: { id: entry.questionId } })).rejects.toSatisfy((error: unknown) => /foreign key|23503|P2003/i.test(JSON.stringify({ code: (error as { code?: string }).code, meta: (error as { meta?: unknown }).meta, message: String(error) })));
});
test('editing a bank question leaves a started attempt unchanged', async () => {
  const { paper } = await world();
  const entry = await prisma.enTestPaperEntry.findFirstOrThrow({ where: { paperId: paper.id } });
  const active = await startTestPaper('learner', paper.id, false);
  await prisma.enTestQuestion.update({ where: { id: entry.questionId }, data: { prompt: 'Changed.' } });
  const item = await prisma.enTestPaperAttemptItem.findFirstOrThrow({ where: { attemptId: active.id } });
  expect(item).toMatchObject({ prompt: 'Pick one.', questionId: entry.questionId });
  await finishTestPaper('learner', active.id);
  expect((await startTestPaper('learner', paper.id, false)).items[0]?.prompt).toBe('Changed.');
});
test('replacing a paper keeps the old questions in the bank', async () => {
  const { subject, paper } = await world();
  const before = await prisma.enTestPaperEntry.findFirstOrThrow({ where: { paperId: paper.id } });
  await saveTestPaper({ subjectId: subject.id, title: 'Paper', description: '', data: await file(two), publish: true, paperId: paper.id });
  expect(await prisma.enTestQuestion.count({ where: { id: before.questionId } })).toBe(1);
  const entries = await prisma.enTestPaperEntry.findMany({ where: { paperId: paper.id }, orderBy: { position: 'asc' } });
  expect(entries).toHaveLength(2);
  expect(entries.map((entry) => entry.questionId)).not.toContain(before.questionId);
});
test('history lists only my finished attempts, newest first, numbered', async () => {
  const { paper } = await world();
  await prisma.enTestSubjectEnrollment.create({ data: { userId: 'other', subjectId: paper.subjectId } });
  for (const userId of ['learner', 'other', 'learner']) await finishTestPaper(userId, (await startTestPaper(userId, paper.id, false)).id);
  const view = await getTestPaperForLearner('learner', paper.id, false);
  expect(view.history.map((row) => row.number)).toEqual([2, 1]);
  expect(view.attemptCount).toBe(2);
});
