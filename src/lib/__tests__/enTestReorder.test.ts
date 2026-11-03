import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ subjectCount: vi.fn(), paperCount: vi.fn(), paperUpdate: vi.fn(), subjectFindMany: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  const tx = { enTestSubject: { count: mock.subjectCount, findMany: mock.subjectFindMany }, enTestPaper: { count: mock.paperCount, update: mock.paperUpdate } };
  return { prisma: { ...tx, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } };
});
import { listMyTestPapers, reorderTestPapers } from '@/services/english/enTestService';
beforeEach(() => {
  vi.clearAllMocks();
  mock.subjectCount.mockResolvedValue(2);
  mock.paperCount.mockResolvedValue(3);
});
it('writes course and position for every paper', async () => {
  await reorderTestPapers([{ subjectId: 's1', paperIds: ['p2', 'p1'] }, { subjectId: 's2', paperIds: ['p3'] }]);
  expect(mock.paperUpdate.mock.calls.map(([arg]) => [arg.where.id, arg.data])).toEqual([
    ['p2', { subjectId: 's1', sortOrder: 0 }], ['p1', { subjectId: 's1', sortOrder: 1 }], ['p3', { subjectId: 's2', sortOrder: 0 }],
  ]);
});
it('rejects a paper listed twice', async () => {
  await expect(reorderTestPapers([{ subjectId: 's1', paperIds: ['p1'] }, { subjectId: 's2', paperIds: ['p1'] }])).rejects.toMatchObject({ status: 400 });
  expect(mock.paperUpdate).not.toHaveBeenCalled();
});
it('rejects an unknown paper', async () => {
  mock.paperCount.mockResolvedValue(1);
  await expect(reorderTestPapers([{ subjectId: 's1', paperIds: ['p1', 'ghost'] }, { subjectId: 's2', paperIds: [] }])).rejects.toMatchObject({ status: 404 });
  expect(mock.paperUpdate).not.toHaveBeenCalled();
});
it('lists joined courses papers in order with the best attempt', async () => {
  mock.subjectFindMany.mockResolvedValue([{ id: 's1', title: 'A', papers: [
    { id: 'p1', title: 'One', _count: { questions: 10 }, attempts: [{ score: 9, total: 10, finishedAt: new Date() }] },
    { id: 'p2', title: 'Two', _count: { questions: 5 }, attempts: [] },
  ] }]);
  const rows = await listMyTestPapers('user');
  expect(rows.map((row) => [row.id, row.subjectTitle, row.best?.passed ?? null])).toEqual([['p1', 'A', true], ['p2', 'A', null]]);
  expect(mock.subjectFindMany.mock.calls[0]![0].where).toMatchObject({ status: 'published', enrollments: { some: { userId: 'user' } } });
});
