import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { seedSmallWorld } from './fixtures';
import { enrollCourse, leaveCourse, listCourses, syncCourseEnrollments } from '@/services/english/enCourseService';

test('course enrollment includes published lessons and preserves word state on leave', async () => {
  const world = await seedSmallWorld(51);
  const userId = world.userIds[0]!;
  const course = await prisma.enCourse.create({ data: { title: 'Test course', status: 'published' } });
  for (const [index, setId] of world.setIds.entries()) await prisma.enSet.update({ where: { id: setId }, data: { courseId: course.id, status: index === 2 ? 'published' : index === 1 ? 'draft' : 'published' } });
  await prisma.enEnrollment.deleteMany({ where: { userId, setId: { in: world.setIds } } });
  await enrollCourse(userId, course.id);
  expect(await prisma.enEnrollment.count({ where: { userId, setId: { in: world.setIds } } })).toBe(2);
  await prisma.enSet.update({ where: { id: world.setIds[1]! }, data: { status: 'published' } });
  await prisma.$transaction((tx) => syncCourseEnrollments(tx, course.id));
  expect(await prisma.enEnrollment.count({ where: { userId, setId: { in: world.setIds } } })).toBe(3);
  const before = await prisma.enWordState.count({ where: { userId } });
  await leaveCourse(userId, course.id);
  expect(await prisma.enEnrollment.count({ where: { userId, setId: { in: world.setIds } } })).toBe(0);
  expect(await prisma.enWordState.count({ where: { userId } })).toBe(before);
});

test('hidden courses remain visible to learners already enrolled', async () => {
  const world = await seedSmallWorld(52);
  const userId = world.userIds[0]!;
  const course = await prisma.enCourse.create({ data: { title: 'Hidden', status: 'published', listed: false } });
  await prisma.enSet.update({ where: { id: world.setIds[0]! }, data: { courseId: course.id } });
  expect((await listCourses(userId, false)).some((row) => row.id === course.id)).toBe(false);
  await prisma.enCourseEnrollment.create({ data: { userId, courseId: course.id } });
  expect((await listCourses(userId, false)).some((row) => row.id === course.id)).toBe(true);
});
