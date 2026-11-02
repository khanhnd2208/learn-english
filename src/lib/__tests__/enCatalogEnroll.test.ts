import { expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ findFirst: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enSet: { findFirst: mock.findFirst, findUnique: mock.findUnique }, enEnrollment: { deleteMany: mock.deleteMany } } }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: vi.fn() }));
import { enrollEnglishSet, unenrollEnglishSet } from '@/services/english/enCatalogService';
it('rejects direct enrollment of a lesson in a course', async () => {
  mock.findFirst.mockResolvedValue({ id: 'set', status: 'published', courseId: 'course' });
  await expect(enrollEnglishSet('user', 'set')).rejects.toMatchObject({ status: 400, message: 'Hãy đăng ký cả khóa học chứa bài này.' });
});
it('rejects direct unenrollment of a lesson in a course', async () => {
  mock.findUnique.mockResolvedValue({ courseId: 'course' });
  await expect(unenrollEnglishSet('user', 'set')).rejects.toMatchObject({ status: 400, message: 'Bài này thuộc một khóa học. Hãy rời cả khóa học.' });
  expect(mock.deleteMany).not.toHaveBeenCalled();
});
