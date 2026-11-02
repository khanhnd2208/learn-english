import { Prisma, type EnExamAttempt, type EnExamAttemptItem } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { vnDayKey } from '@/lib/english/gapRule';
import { examPercent, examToText, gradeExamAnswer, isExamPassed, parseExamText, pickBestAttempt, type ExamQuestionInput } from '@/lib/english/exam';
import type { CourseExamRow } from '@/services/english/enCourseService';

export interface PublicAttempt {
  id: string; position: number; total: number;
  items: Array<{ position: number; type: string; prompt: string; options: string[]; answer: string | null }>;
}
export interface ExamResult {
  attemptId: string; examId: string; courseId: string; score: number; total: number; percent: number; passed: boolean;
  items: Array<{ position: number; type: string; prompt: string; options: string[]; answer: string | null; correct: boolean; correctText: string; explanationVi: string }>;
}
const publicAttempt = (attempt: EnExamAttempt & { items: EnExamAttemptItem[] }): PublicAttempt => ({
  id: attempt.id, position: attempt.position, total: attempt.total,
  items: [...attempt.items].sort((a, b) => a.position - b.position).map((item) => ({ position: item.position, type: item.type, prompt: item.prompt, options: item.options, answer: item.answer })),
});
const bestSummary = (attempts: Array<{ score: number | null; total: number; finishedAt: Date | null }>) => {
  const valid = attempts.filter((attempt): attempt is { score: number; total: number; finishedAt: Date } => attempt.score !== null && attempt.finishedAt !== null);
  const best = pickBestAttempt(valid);
  return best ? { score: best.score, total: best.total, passed: isExamPassed(best.score, best.total) } : null;
};

export function previewExam(text: string) { return parseExamText(text); }

export async function saveExam(input: { courseId: string; setId: string | null; title: string; description: string; text: string; publish: boolean; examId?: string }) {
  const parsed = parseExamText(input.text);
  if (parsed.issues.length) throw new AppError('Đề còn lỗi, hãy sửa rồi lưu lại.', 400);
  return prisma.$transaction(async (tx) => {
    if (input.setId) {
      const set = await tx.enSet.findFirst({ where: { id: input.setId, courseId: input.courseId }, select: { id: true } });
      if (!set) throw new AppError('Bài không thuộc khóa này.', 400);
    }
    let exam;
    if (input.examId) {
      const existing = await tx.enExam.findFirst({ where: { id: input.examId, courseId: input.courseId }, select: { id: true } });
      if (!existing) throw new AppError('Không tìm thấy bài kiểm tra', 404);
      exam = await tx.enExam.update({ where: { id: input.examId }, data: { title: input.title, description: input.description, setId: input.setId, ...(input.publish ? { status: 'published' } : {}) } });
      await tx.enExamQuestion.deleteMany({ where: { examId: exam.id } });
    } else {
      const last = await tx.enExam.findFirst({ where: { courseId: input.courseId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
      exam = await tx.enExam.create({ data: { courseId: input.courseId, setId: input.setId, title: input.title, description: input.description, status: input.publish ? 'published' : 'draft', sortOrder: (last?.sortOrder ?? -1) + 1 } });
    }
    await tx.enExamQuestion.createMany({ data: parsed.questions.map((question, position) => ({ examId: exam.id, position, type: question.type, prompt: question.prompt, options: question.type === 'mcq' ? question.options : [], correctIndex: question.type === 'mcq' ? question.correctIndex : null, answers: question.type === 'fill' ? question.answers : [], explanationVi: question.explanationVi })) });
    return exam;
  });
}
export async function setExamStatus(examId: string, status: 'draft' | 'published') {
  if (status === 'published' && !(await prisma.enExamQuestion.count({ where: { examId } }))) throw new AppError('Đề chưa có câu hỏi.', 400);
  return prisma.enExam.update({ where: { id: examId }, data: { status } });
}
export async function deleteExam(examId: string) { await prisma.enExam.delete({ where: { id: examId } }); return { deleted: true }; }
export async function getExamForAdmin(examId: string) {
  const exam = await prisma.enExam.findUnique({ where: { id: examId }, include: { questions: { orderBy: { position: 'asc' } } } });
  if (!exam) throw new AppError('Không tìm thấy bài kiểm tra', 404);
  const questions = exam.questions.map((question): ExamQuestionInput => question.type === 'mcq'
    ? { type: 'mcq', prompt: question.prompt, options: question.options, correctIndex: question.correctIndex ?? 0, explanationVi: question.explanationVi }
    : { type: 'fill', prompt: question.prompt, answers: question.answers, explanationVi: question.explanationVi });
  return { title: exam.title, description: exam.description, setId: exam.setId, text: examToText(questions) };
}

export async function courseExamRows(userId: string, courseId: string, isAdmin: boolean): Promise<CourseExamRow[]> {
  const [sets, exams] = await Promise.all([
    prisma.enSet.findMany({ where: { courseId, ...(isAdmin ? {} : { status: 'published' }) }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true, title: true } }),
    prisma.enExam.findMany({ where: { courseId, ...(isAdmin ? {} : { status: 'published', questions: { some: {} }, OR: [{ setId: null }, { set: { status: 'published' } }] }) }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], include: { set: { select: { title: true } }, _count: { select: { questions: true } }, attempts: { where: { userId }, select: { status: true, score: true, total: true, finishedAt: true } } } }),
  ]);
  const bySet = new Map(sets.map((set, index) => [set.id, { number: index + 1, title: set.title }]));
  return exams.map((exam) => {
    const lesson = exam.setId ? bySet.get(exam.setId) : null;
    return { id: exam.id, title: exam.title, setId: exam.setId, lessonNumber: lesson?.number ?? null, lessonTitle: lesson?.title ?? null, status: exam.status, questionCount: exam._count.questions, inProgress: exam.attempts.some((attempt) => attempt.status === 'in_progress'), best: bestSummary(exam.attempts), attempts: exam.attempts.filter((attempt) => attempt.status === 'finished').length };
  }).sort((a, b) => (a.lessonNumber ?? Number.MAX_SAFE_INTEGER) - (b.lessonNumber ?? Number.MAX_SAFE_INTEGER) || exams.findIndex((exam) => exam.id === a.id) - exams.findIndex((exam) => exam.id === b.id));
}

async function accessibleExam(userId: string, examId: string, isAdmin: boolean) {
  const exam = await prisma.enExam.findUnique({ where: { id: examId }, include: { course: { include: { enrollments: { where: { userId }, select: { id: true } } } }, set: { select: { status: true, title: true } }, _count: { select: { questions: true } } } });
  if (!exam || (!isAdmin && (exam.status !== 'published' || !exam._count.questions || (exam.setId && exam.set?.status !== 'published')))) throw new AppError('Không tìm thấy bài kiểm tra', 404);
  if (!isAdmin && !exam.course.enrollments.length) throw new AppError('Hãy đăng ký khóa học để làm bài kiểm tra.', 403);
  return exam;
}
export async function getExamForLearner(userId: string, examId: string, isAdmin: boolean) {
  const exam = await accessibleExam(userId, examId, isAdmin);
  const attempts = await prisma.enExamAttempt.findMany({ where: { userId, examId }, include: { items: { orderBy: { position: 'asc' } } }, orderBy: { startedAt: 'desc' } });
  const active = attempts.find((attempt) => attempt.status === 'in_progress');
  const finished = attempts.filter((attempt) => attempt.status === 'finished' && attempt.score !== null && attempt.finishedAt !== null);
  const last = finished[0];
  return {
    exam: { id: exam.id, title: exam.title, description: exam.description, courseId: exam.courseId, courseTitle: exam.course.title, lessonTitle: exam.set?.title ?? null, questionCount: exam._count.questions },
    attempt: active ? publicAttempt(active) : null,
    best: bestSummary(finished),
    lastFinished: last ? { score: last.score!, total: last.total, passed: isExamPassed(last.score!, last.total), day: vnDayKey(last.finishedAt!) } : null,
  };
}

export async function startExam(userId: string, examId: string, isAdmin: boolean): Promise<PublicAttempt> {
  const exam = await accessibleExam(userId, examId, isAdmin);
  if (!exam._count.questions) throw new AppError('Đề chưa có câu hỏi.', 400);
  const activeKey = `${userId}:${examId}`;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.enExamAttempt.findUnique({ where: { activeKey }, include: { items: { orderBy: { position: 'asc' } } } });
      if (existing) return publicAttempt(existing);
      const questions = await tx.enExamQuestion.findMany({ where: { examId }, orderBy: { position: 'asc' } });
      if (!questions.length) throw new AppError('Đề chưa có câu hỏi.', 400);
      const attempt = await tx.enExamAttempt.create({ data: { userId, examId, activeKey, total: questions.length } });
      await tx.enExamAttemptItem.createMany({ data: questions.map((question) => ({ attemptId: attempt.id, position: question.position, type: question.type, prompt: question.prompt, options: question.options, correctIndex: question.correctIndex, answers: question.answers, explanationVi: question.explanationVi })) });
      const items = await tx.enExamAttemptItem.findMany({ where: { attemptId: attempt.id }, orderBy: { position: 'asc' } });
      return publicAttempt({ ...attempt, items });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.enExamAttempt.findUnique({ where: { activeKey }, include: { items: { orderBy: { position: 'asc' } } } });
      if (existing) return publicAttempt(existing);
    }
    throw error;
  }
}
export async function answerExam(userId: string, attemptId: string, position: number, answer: string): Promise<{ saved: true }> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.enExamAttempt.findFirst({ where: { id: attemptId, userId, status: 'in_progress' }, include: { items: { where: { position } } } });
    if (!attempt) throw new AppError('Không tìm thấy lượt làm bài', 404);
    const item = attempt.items[0];
    if (!item) throw new AppError('Câu trả lời không hợp lệ', 400);
    const value = answer.trim();
    if (value && item.type === 'mcq' && (!/^[0-5]$/.test(value) || Number(value) >= item.options.length)) throw new AppError('Câu trả lời không hợp lệ', 400);
    await tx.enExamAttemptItem.update({ where: { id: item.id }, data: { answer: value || null, correct: value ? gradeExamAnswer(item, value) : null, answeredAt: value ? new Date() : null } });
    await tx.enExamAttempt.update({ where: { id: attempt.id }, data: { position } });
    return { saved: true };
  });
}
function resultOf(attempt: EnExamAttempt & { items: EnExamAttemptItem[]; exam: { courseId: string } }): ExamResult {
  const score = attempt.score ?? attempt.items.filter((item) => item.correct).length;
  return { attemptId: attempt.id, examId: attempt.examId, courseId: attempt.exam.courseId, score, total: attempt.total, percent: examPercent(score, attempt.total), passed: isExamPassed(score, attempt.total), items: [...attempt.items].sort((a, b) => a.position - b.position).map((item) => ({ position: item.position, type: item.type, prompt: item.prompt, options: item.options, answer: item.answer, correct: item.correct ?? false, correctText: item.type === 'mcq' ? item.options[item.correctIndex ?? -1] ?? '' : item.answers.join(' / '), explanationVi: item.explanationVi })) };
}
export async function finishExam(userId: string, attemptId: string): Promise<ExamResult> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.enExamAttempt.findFirst({ where: { id: attemptId, userId }, include: { items: true, exam: { select: { courseId: true } } } });
    if (!attempt) throw new AppError('Không tìm thấy lượt làm bài', 404);
    if (attempt.status === 'finished') return resultOf(attempt);
    await tx.enExamAttemptItem.updateMany({ where: { attemptId, answer: null }, data: { correct: false } });
    const score = attempt.items.filter((item) => item.correct).length;
    const updated = await tx.enExamAttempt.update({ where: { id: attemptId }, data: { status: 'finished', score, finishedAt: new Date(), activeKey: null }, include: { items: true, exam: { select: { courseId: true } } } });
    return resultOf(updated);
  });
}
