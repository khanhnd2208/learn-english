import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ findUnique: vi.fn(), subjectEnrollmentFindUnique: vi.fn(), deleteMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enSet: { findUnique: mock.findUnique }, enVocabSubjectEnrollment: { findUnique: mock.subjectEnrollmentFindUnique }, enEnrollment: { deleteMany: mock.deleteMany } } }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: vi.fn() }));
import { unenrollEnglishSet } from '@/services/english/enCatalogService';

beforeEach(() => vi.clearAllMocks());

it('rejects removing a set of a subject the learner is enrolled in', async () => {
  mock.findUnique.mockResolvedValue({ subjectId: 'subject' });
  mock.subjectEnrollmentFindUnique.mockResolvedValue({ id: 'enrollment' });
  await expect(unenrollEnglishSet('user', 'set')).rejects.toMatchObject({ status: 400, message: 'Bộ này thuộc môn học bạn đã đăng ký. Hãy rời cả môn học.' });
  expect(mock.deleteMany).not.toHaveBeenCalled();
});
it('removes a set of a subject the learner is not enrolled in', async () => {
  mock.findUnique.mockResolvedValue({ subjectId: 'subject' });
  mock.subjectEnrollmentFindUnique.mockResolvedValue(null);
  await unenrollEnglishSet('user', 'set');
  expect(mock.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user', setId: 'set' } });
});
it('removes a standalone set', async () => {
  mock.findUnique.mockResolvedValue({ subjectId: null });
  await unenrollEnglishSet('user', 'set');
  expect(mock.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user', setId: 'set' } });
});
