import { beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  subjectFindUnique: vi.fn(), subjectDelete: vi.fn(), paperCount: vi.fn(),
  enrollmentUpsert: vi.fn(), enrollmentDeleteMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => {
  // Only the test-mode models exist here: touching any other table would throw.
  const tx = {
    enTestSubject: { findUnique: mock.subjectFindUnique, delete: mock.subjectDelete },
    enTestSubjectEnrollment: { upsert: mock.enrollmentUpsert, deleteMany: mock.enrollmentDeleteMany },
  };
  return { prisma: { ...tx, enTestPaper: { count: mock.paperCount }, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } };
});
vi.mock('@/lib/accessCode', () => ({ accessCodeMatches: (expected: string, actual: string) => expected.toLowerCase() === actual.trim().toLowerCase() }));
import { deleteTestSubject, enrollTestSubject, leaveTestSubject } from '@/services/english/enTestSubjectService';

beforeEach(() => vi.clearAllMocks());

it('rejects a wrong password before writing', async () => {
  mock.subjectFindUnique.mockResolvedValue({ status: 'published', listed: true, accessCode: 'secret', enrollments: [] });
  await expect(enrollTestSubject('user', 'subject', 'wrong')).rejects.toMatchObject({ status: 403, code: 'ACCESS_CODE' });
  expect(mock.enrollmentUpsert).not.toHaveBeenCalled();
});
it('accepts the password in another case', async () => {
  mock.subjectFindUnique.mockResolvedValue({ status: 'published', listed: true, accessCode: 'Secret', enrollments: [] });
  await enrollTestSubject('user', 'subject', ' secret ');
  expect(mock.enrollmentUpsert).toHaveBeenCalledTimes(1);
  expect(mock.enrollmentUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: 'user', subjectId: 'subject' } }));
});
it('closes enrollment for new learners of a hidden subject', async () => {
  mock.subjectFindUnique.mockResolvedValue({ status: 'published', listed: false, accessCode: null, enrollments: [] });
  await expect(enrollTestSubject('user', 'subject')).rejects.toMatchObject({ status: 404, message: 'Môn học không còn mở đăng ký' });
});
it('lets an enrolled learner back in without the password', async () => {
  mock.subjectFindUnique.mockResolvedValue({ status: 'published', listed: false, accessCode: 'secret', enrollments: [{ id: 'e' }] });
  await enrollTestSubject('user', 'subject');
  expect(mock.enrollmentUpsert).toHaveBeenCalledTimes(1);
});
it('leaving only removes the enrollment', async () => {
  await leaveTestSubject('user', 'subject');
  expect(mock.enrollmentDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user', subjectId: 'subject' } });
});
it('cannot delete a subject that still has papers', async () => {
  mock.paperCount.mockResolvedValue(2);
  await expect(deleteTestSubject('subject')).rejects.toMatchObject({ message: 'Hãy xóa hết bài kiểm tra của khóa trước khi xóa.' });
  expect(mock.subjectDelete).not.toHaveBeenCalled();
});
