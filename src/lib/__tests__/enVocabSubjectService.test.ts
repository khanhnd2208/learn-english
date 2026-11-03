import { beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  subjectFindUnique: vi.fn(), subjectDelete: vi.fn(), setFindMany: vi.fn(), setFindUnique: vi.fn(),
  setFindFirst: vi.fn(), setUpdate: vi.fn(), setCount: vi.fn(),
  subjectEnrollmentFindMany: vi.fn(), subjectEnrollmentUpsert: vi.fn(), subjectEnrollmentDeleteMany: vi.fn(),
  enrollmentCreateMany: vi.fn(), enrollmentDeleteMany: vi.fn(), wordStateDeleteMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => {
  const tx = {
    enVocabSubject: { findUnique: mock.subjectFindUnique, delete: mock.subjectDelete },
    enSet: { findMany: mock.setFindMany, findUnique: mock.setFindUnique, findFirst: mock.setFindFirst, update: mock.setUpdate },
    enVocabSubjectEnrollment: { findMany: mock.subjectEnrollmentFindMany, upsert: mock.subjectEnrollmentUpsert, deleteMany: mock.subjectEnrollmentDeleteMany },
    enEnrollment: { createMany: mock.enrollmentCreateMany, deleteMany: mock.enrollmentDeleteMany },
    enWordState: { deleteMany: mock.wordStateDeleteMany },
  };
  return { prisma: { ...tx, enSet: { ...tx.enSet, count: mock.setCount }, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } };
});
vi.mock('@/lib/accessCode', () => ({ accessCodeMatches: (expected: string, actual: string) => expected.toLowerCase() === actual.trim().toLowerCase() }));
vi.mock('@/services/english/enCatalogService', () => ({ listEnglishSets: vi.fn() }));
import { addSetToSubject, deleteVocabSubject, enrollVocabSubject, leaveVocabSubject, moveSubjectSet } from '@/services/english/enVocabSubjectService';

beforeEach(() => { vi.clearAllMocks(); mock.subjectEnrollmentFindMany.mockResolvedValue([{ userId: 'user' }]); mock.setFindMany.mockResolvedValue([{ id: 'set-1' }, { id: 'set-2' }]); mock.enrollmentCreateMany.mockResolvedValue({ count: 2 }); });

it('enrolls a learner in every published set with skipDuplicates', async () => {
  mock.subjectFindUnique.mockResolvedValue({ status: 'published', listed: true, accessCode: null, enrollments: [] });
  await enrollVocabSubject('user', 'subject');
  expect(mock.subjectEnrollmentUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: 'user', subjectId: 'subject' } }));
  expect(mock.setFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { subjectId: 'subject', status: 'published' } }));
  expect(mock.enrollmentCreateMany).toHaveBeenCalledWith({ data: [{ userId: 'user', setId: 'set-1' }, { userId: 'user', setId: 'set-2' }], skipDuplicates: true });
});
it('rejects a wrong subject password before writing', async () => {
  mock.subjectFindUnique.mockResolvedValue({ status: 'published', listed: true, accessCode: 'secret', enrollments: [] });
  await expect(enrollVocabSubject('user', 'subject', 'wrong')).rejects.toMatchObject({ status: 403, code: 'ACCESS_CODE' });
  expect(mock.subjectEnrollmentUpsert).not.toHaveBeenCalled();
});
it('rejects a new learner when subject listing is closed', async () => {
  mock.subjectFindUnique.mockResolvedValue({ status: 'published', listed: false, accessCode: null, enrollments: [] });
  await expect(enrollVocabSubject('user', 'subject')).rejects.toMatchObject({ status: 404, message: 'Môn học không còn mở đăng ký' });
});
it('leaves a subject without deleting word state', async () => {
  await leaveVocabSubject('user', 'subject');
  expect(mock.enrollmentDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user', setId: { in: ['set-1', 'set-2'] } } });
  expect(mock.wordStateDeleteMany).not.toHaveBeenCalled();
});
it('cannot delete a subject while it contains a set', async () => {
  mock.setCount.mockResolvedValue(1);
  await expect(deleteVocabSubject('subject')).rejects.toMatchObject({ status: 400, message: 'Hãy gỡ hết bộ từ khỏi môn trước khi xóa.' });
  expect(mock.subjectDelete).not.toHaveBeenCalled();
});
it('rejects a set already in another subject', async () => {
  mock.setFindUnique.mockResolvedValue({ id: 'set-1', subjectId: 'other' });
  await expect(addSetToSubject('subject', 'set-1')).rejects.toMatchObject({ status: 400, message: 'Bộ này đang thuộc môn khác. Hãy gỡ khỏi môn đó trước.' });
});
it('adds a published set after the last set and synchronizes enrollments', async () => {
  mock.setFindUnique.mockResolvedValue({ id: 'set-1', subjectId: null });
  mock.setFindFirst.mockResolvedValue({ sortOrder: 4 });
  mock.setUpdate.mockResolvedValue({ id: 'set-1', status: 'published' });
  await addSetToSubject('subject', 'set-1');
  expect(mock.setUpdate).toHaveBeenCalledWith({ where: { id: 'set-1' }, data: { subjectId: 'subject', sortOrder: 5 } });
  expect(mock.enrollmentCreateMany).toHaveBeenCalled();
});
it('does not move the first set upward', async () => {
  await moveSubjectSet('subject', 'set-1', 'up');
  expect(mock.setUpdate).not.toHaveBeenCalled();
});
it('moves the second set upward', async () => {
  await moveSubjectSet('subject', 'set-2', 'up');
  expect(mock.setUpdate).toHaveBeenNthCalledWith(1, { where: { id: 'set-2' }, data: { sortOrder: 0 } });
  expect(mock.setUpdate).toHaveBeenNthCalledWith(2, { where: { id: 'set-1' }, data: { sortOrder: 1 } });
});
