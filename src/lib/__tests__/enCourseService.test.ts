import { beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  courseFindUnique: vi.fn(), courseDelete: vi.fn(), setFindMany: vi.fn(), setFindUnique: vi.fn(),
  setFindFirst: vi.fn(), setUpdate: vi.fn(), setCount: vi.fn(),
  courseEnrollmentFindMany: vi.fn(), courseEnrollmentUpsert: vi.fn(), courseEnrollmentDeleteMany: vi.fn(),
  enrollmentCreateMany: vi.fn(), enrollmentDeleteMany: vi.fn(), wordStateDeleteMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => {
  const tx = {
    enCourse: { findUnique: mock.courseFindUnique, delete: mock.courseDelete },
    enSet: { findMany: mock.setFindMany, findUnique: mock.setFindUnique, findFirst: mock.setFindFirst, update: mock.setUpdate },
    enCourseEnrollment: { findMany: mock.courseEnrollmentFindMany, upsert: mock.courseEnrollmentUpsert, deleteMany: mock.courseEnrollmentDeleteMany },
    enEnrollment: { createMany: mock.enrollmentCreateMany, deleteMany: mock.enrollmentDeleteMany },
    enWordState: { deleteMany: mock.wordStateDeleteMany },
  };
  return { prisma: { ...tx, enSet: { ...tx.enSet, count: mock.setCount }, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } };
});
vi.mock('@/services/english/enCatalogService', () => ({ accessCodeMatches: (expected: string, actual: string) => expected.toLowerCase() === actual.trim().toLowerCase(), listEnglishSets: vi.fn() }));
import { addSetToCourse, deleteCourse, enrollCourse, leaveCourse, moveLesson } from '@/services/english/enCourseService';

beforeEach(() => { vi.clearAllMocks(); mock.courseEnrollmentFindMany.mockResolvedValue([{ userId: 'user' }]); mock.setFindMany.mockResolvedValue([{ id: 'set-1' }, { id: 'set-2' }]); mock.enrollmentCreateMany.mockResolvedValue({ count: 2 }); });

it('enrolls a learner in every published lesson with skipDuplicates', async () => {
  mock.courseFindUnique.mockResolvedValue({ status: 'published', listed: true, accessCode: null, enrollments: [] });
  await enrollCourse('user', 'course');
  expect(mock.courseEnrollmentUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: 'user', courseId: 'course' } }));
  expect(mock.setFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { courseId: 'course', status: 'published' } }));
  expect(mock.enrollmentCreateMany).toHaveBeenCalledWith({ data: [{ userId: 'user', setId: 'set-1' }, { userId: 'user', setId: 'set-2' }], skipDuplicates: true });
});
it('rejects a wrong course password before writing', async () => {
  mock.courseFindUnique.mockResolvedValue({ status: 'published', listed: true, accessCode: 'secret', enrollments: [] });
  await expect(enrollCourse('user', 'course', 'wrong')).rejects.toMatchObject({ status: 403, code: 'ACCESS_CODE' });
  expect(mock.courseEnrollmentUpsert).not.toHaveBeenCalled();
});
it('rejects a new learner when course listing is closed', async () => {
  mock.courseFindUnique.mockResolvedValue({ status: 'published', listed: false, accessCode: null, enrollments: [] });
  await expect(enrollCourse('user', 'course')).rejects.toMatchObject({ status: 404, message: 'Khóa học không còn mở đăng ký' });
});
it('leaves a course without deleting word state', async () => {
  await leaveCourse('user', 'course');
  expect(mock.enrollmentDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user', setId: { in: ['set-1', 'set-2'] } } });
  expect(mock.wordStateDeleteMany).not.toHaveBeenCalled();
});
it('cannot delete a course while it contains a lesson', async () => {
  mock.setCount.mockResolvedValue(1);
  await expect(deleteCourse('course')).rejects.toMatchObject({ status: 400, message: 'Hãy gỡ hết bài khỏi khóa trước khi xóa.' });
  expect(mock.courseDelete).not.toHaveBeenCalled();
});
it('rejects a lesson already in another course', async () => {
  mock.setFindUnique.mockResolvedValue({ id: 'set-1', courseId: 'other' });
  await expect(addSetToCourse('course', 'set-1')).rejects.toMatchObject({ status: 400 });
});
it('adds a published lesson after the last lesson and synchronizes enrollments', async () => {
  mock.setFindUnique.mockResolvedValue({ id: 'set-1', courseId: null });
  mock.setFindFirst.mockResolvedValue({ sortOrder: 4 });
  mock.setUpdate.mockResolvedValue({ id: 'set-1', status: 'published' });
  await addSetToCourse('course', 'set-1');
  expect(mock.setUpdate).toHaveBeenCalledWith({ where: { id: 'set-1' }, data: { courseId: 'course', sortOrder: 5 } });
  expect(mock.enrollmentCreateMany).toHaveBeenCalled();
});
it('does not move the first lesson upward', async () => {
  await moveLesson('course', 'set-1', 'up');
  expect(mock.setUpdate).not.toHaveBeenCalled();
});
it('moves the second lesson upward', async () => {
  await moveLesson('course', 'set-2', 'up');
  expect(mock.setUpdate).toHaveBeenNthCalledWith(1, { where: { id: 'set-2' }, data: { sortOrder: 0 } });
  expect(mock.setUpdate).toHaveBeenNthCalledWith(2, { where: { id: 'set-1' }, data: { sortOrder: 1 } });
});
