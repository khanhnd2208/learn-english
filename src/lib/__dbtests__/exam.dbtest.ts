import { expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { resetEnTables } from './setup';
import { finishExam, saveExam, startExam } from '@/services/english/enExamService';
import { removeSetFromCourse } from '@/services/english/enCourseService';

const firstText = 'Câu 1: Pick one.\nA. no\n*B. yes';
async function examWorld() {
  await resetEnTables(prisma);
  const course = await prisma.enCourse.create({ data: { title: 'Test', status: 'published' } });
  const exam = await saveExam({ courseId: course.id, setId: null, title: 'Exam', description: '', text: firstText, publish: true });
  await prisma.enCourseEnrollment.create({ data: { userId: 'learner', courseId: course.id } });
  return { course, exam };
}

test('two concurrent starts create only one active attempt', async () => {
  const { exam } = await examWorld();
  const results = await Promise.all([startExam('learner', exam.id, false), startExam('learner', exam.id, false)]);
  expect(results[0].id).toBe(results[1].id);
  expect(await prisma.enExamAttempt.count({ where: { userId: 'learner', examId: exam.id, status: 'in_progress' } })).toBe(1);
});
test('editing an exam preserves an active attempt snapshot', async () => {
  const { course, exam } = await examWorld();
  const active = await startExam('learner', exam.id, false);
  await saveExam({ courseId: course.id, setId: null, title: 'Exam', description: '', text: `${firstText}\n\nCâu 2: A ___ B.\nĐáp án: and`, publish: true, examId: exam.id });
  const old = await prisma.enExamAttempt.findUniqueOrThrow({ where: { id: active.id }, include: { items: true } });
  expect(old.items).toHaveLength(1);
  expect(old.items[0]?.prompt).toBe('Pick one.');
  await finishExam('learner', active.id);
  const next = await startExam('learner', exam.id, false);
  expect(next.items).toHaveLength(2);
});
test('removing a lesson keeps its exam in the course as a summary exam', async () => {
  const { course } = await examWorld();
  const set = await prisma.enSet.create({ data: { title: 'Lesson', status: 'published', courseId: course.id } });
  const exam = await saveExam({ courseId: course.id, setId: set.id, title: 'Lesson exam', description: '', text: firstText, publish: true });
  await removeSetFromCourse(course.id, set.id);
  expect((await prisma.enExam.findUniqueOrThrow({ where: { id: exam.id } })).setId).toBeNull();
});
