import { Prisma, type EnTestPaperAttempt, type EnTestPaperAttemptItem } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { vnDayKey } from '@/lib/english/gapRule';
import { formatVnDay, gradeTestAnswer, isTestPassed, pickBestAttempt, testPercent, type TestQuestionInput } from '@/lib/english/testPaper';
import { parseTestRows } from '@/lib/english/testImport';
import { buildTestWorkbook, readTestWorkbook } from '@/services/english/enTestWorkbookService';

export interface PublicTestAttempt {
  id: string; position: number; total: number;
  items: Array<{ position: number; type: string; prompt: string; options: string[]; answer: string | null }>;
}
export interface TestResult {
  attemptId: string; paperId: string; subjectId: string; score: number; total: number; percent: number; passed: boolean;
  items: Array<{ position: number; type: string; prompt: string; options: string[]; answer: string | null; correct: boolean; correctText: string; explanationVi: string }>;
}
type AttemptWithItems = EnTestPaperAttempt & { items: EnTestPaperAttemptItem[] };
type AttemptWithPaper = AttemptWithItems & { paper: { subjectId: string } };

const publicAttempt = (attempt: AttemptWithItems): PublicTestAttempt => ({
  id: attempt.id, position: attempt.position, total: attempt.total,
  items: [...attempt.items].sort((a, b) => a.position - b.position).map((item) => ({ position: item.position, type: item.type, prompt: item.prompt, options: item.options, answer: item.answer })),
});
const bestSummary = (attempts: Array<{ score: number | null; total: number; finishedAt: Date | null }>) => {
  const valid = attempts.filter((attempt): attempt is { score: number; total: number; finishedAt: Date } => attempt.score !== null && attempt.finishedAt !== null);
  const best = pickBestAttempt(valid);
  return best ? { score: best.score, total: best.total, passed: isTestPassed(best.score, best.total) } : null;
};

export async function previewTestImport(data: ArrayBuffer) { return parseTestRows(await readTestWorkbook(data)); }

export async function saveTestPaper(input: { subjectId: string; title: string; description: string; data: ArrayBuffer; publish: boolean; paperId?: string }) {
  const parsed = parseTestRows(await readTestWorkbook(input.data));
  if (parsed.issues.length) throw new AppError('File còn lỗi, hãy sửa rồi tải lên lại.', 400);
  return prisma.$transaction(async (tx) => {
    const subject = await tx.enTestSubject.findUnique({ where: { id: input.subjectId }, select: { id: true } });
    if (!subject) throw new AppError('Không tìm thấy môn học', 404);
    let paper;
    if (input.paperId) {
      const existing = await tx.enTestPaper.findFirst({ where: { id: input.paperId, subjectId: input.subjectId }, select: { id: true } });
      if (!existing) throw new AppError('Không tìm thấy bài kiểm tra', 404);
      paper = await tx.enTestPaper.update({ where: { id: input.paperId }, data: { title: input.title, description: input.description, ...(input.publish ? { status: 'published' } : {}) } });
      await tx.enTestPaperQuestion.deleteMany({ where: { paperId: paper.id } });
    } else {
      const last = await tx.enTestPaper.findFirst({ where: { subjectId: input.subjectId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
      paper = await tx.enTestPaper.create({ data: { subjectId: input.subjectId, title: input.title, description: input.description, status: input.publish ? 'published' : 'draft', sortOrder: (last?.sortOrder ?? -1) + 1 } });
    }
    await tx.enTestPaperQuestion.createMany({ data: parsed.questions.map((question, position) => ({ paperId: paper.id, position, type: question.type, prompt: question.prompt, options: question.type === 'mcq' ? question.options : [], correctIndex: question.type === 'mcq' ? question.correctIndex : null, answers: question.type === 'fill' ? question.answers : [], explanationVi: question.explanationVi })) });
    return paper;
  });
}
export async function setTestPaperStatus(paperId: string, status: 'draft' | 'published') {
  if (status === 'published' && !(await prisma.enTestPaperQuestion.count({ where: { paperId } }))) throw new AppError('Bài kiểm tra chưa có câu hỏi.', 400);
  return prisma.enTestPaper.update({ where: { id: paperId }, data: { status } });
}
export async function deleteTestPaper(paperId: string) { await prisma.enTestPaper.delete({ where: { id: paperId } }); return { deleted: true }; }
export async function exportTestPaper(paperId: string): Promise<{ fileName: string; data: Buffer }> {
  const paper = await prisma.enTestPaper.findUnique({ where: { id: paperId }, include: { questions: { orderBy: { position: 'asc' } } } });
  if (!paper) throw new AppError('Không tìm thấy bài kiểm tra', 404);
  const questions = paper.questions.map((question): TestQuestionInput => question.type === 'mcq'
    ? { type: 'mcq', prompt: question.prompt, options: question.options, correctIndex: question.correctIndex ?? 0, explanationVi: question.explanationVi }
    : { type: 'fill', prompt: question.prompt, answers: question.answers, explanationVi: question.explanationVi });
  return { fileName: 'bai-kiem-tra.xlsx', data: await buildTestWorkbook(questions) };
}
export interface MyTestPaper { id: string; title: string; subjectId: string; subjectTitle: string; questionCount: number; best: { score: number; total: number; passed: boolean } | null }
/** Published papers of the published courses the learner joined, in course then paper order. */
export async function listMyTestPapers(userId: string): Promise<MyTestPaper[]> {
  const subjects = await prisma.enTestSubject.findMany({
    where: { status: 'published', enrollments: { some: { userId } } },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: { papers: { where: { status: 'published', questions: { some: {} } }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], include: { _count: { select: { questions: true } }, attempts: { where: { userId, status: 'finished' }, select: { score: true, total: true, finishedAt: true } } } } },
  });
  return subjects.flatMap((subject) => subject.papers.map((paper) => ({ id: paper.id, title: paper.title, subjectId: subject.id, subjectTitle: subject.title, questionCount: paper._count.questions, best: bestSummary(paper.attempts) })));
}
/** Sets each paper's course and position from the given columns, atomically. Papers not listed stay as they are. */
export async function reorderTestPapers(columns: Array<{ subjectId: string; paperIds: string[] }>) {
  const paperIds = columns.flatMap((column) => column.paperIds);
  if (new Set(paperIds).size !== paperIds.length) throw new AppError('Một bài kiểm tra xuất hiện hai lần.', 400);
  await prisma.$transaction(async (tx) => {
    const subjectIds = columns.map((column) => column.subjectId);
    if (new Set(subjectIds).size !== subjectIds.length) throw new AppError('Một khóa học xuất hiện hai lần.', 400);
    if (await tx.enTestSubject.count({ where: { id: { in: subjectIds } } }) !== subjectIds.length) throw new AppError('Không tìm thấy khóa học', 404);
    if (await tx.enTestPaper.count({ where: { id: { in: paperIds } } }) !== paperIds.length) throw new AppError('Không tìm thấy bài kiểm tra', 404);
    for (const column of columns) {
      for (const [index, paperId] of column.paperIds.entries()) await tx.enTestPaper.update({ where: { id: paperId }, data: { subjectId: column.subjectId, sortOrder: index } });
    }
  });
  return { ok: true };
}
export async function paperSubjectId(paperId: string): Promise<string | null> {
  return (await prisma.enTestPaper.findUnique({ where: { id: paperId }, select: { subjectId: true } }))?.subjectId ?? null;
}

async function accessiblePaper(userId: string, paperId: string, isAdmin: boolean) {
  const paper = await prisma.enTestPaper.findUnique({ where: { id: paperId }, include: { subject: { include: { enrollments: { where: { userId }, select: { id: true } } } }, _count: { select: { questions: true } } } });
  if (!paper || (!isAdmin && (paper.status !== 'published' || !paper._count.questions || paper.subject.status !== 'published'))) throw new AppError('Không tìm thấy bài kiểm tra', 404);
  if (!isAdmin && !paper.subject.enrollments.length) throw new AppError('Hãy đăng ký môn học để làm bài kiểm tra.', 403);
  return paper;
}
export async function getTestPaperForLearner(userId: string, paperId: string, isAdmin: boolean) {
  const paper = await accessiblePaper(userId, paperId, isAdmin);
  const attempts = await prisma.enTestPaperAttempt.findMany({ where: { userId, paperId }, include: { items: { orderBy: { position: 'asc' } } }, orderBy: { startedAt: 'desc' } });
  const active = attempts.find((attempt) => attempt.status === 'in_progress');
  const finished = attempts.filter((attempt) => attempt.status === 'finished' && attempt.score !== null && attempt.finishedAt !== null);
  const last = finished.sort((a, b) => b.finishedAt!.getTime() - a.finishedAt!.getTime())[0];
  return {
    paper: { id: paper.id, title: paper.title, description: paper.description, subjectId: paper.subjectId, subjectTitle: paper.subject.title, questionCount: paper._count.questions },
    attempt: active ? publicAttempt(active) : null,
    best: bestSummary(finished),
    lastFinished: last ? { attemptId: last.id, score: last.score!, total: last.total, passed: isTestPassed(last.score!, last.total), day: formatVnDay(vnDayKey(last.finishedAt!)) } : null,
  };
}

export async function startTestPaper(userId: string, paperId: string, isAdmin: boolean): Promise<PublicTestAttempt> {
  const paper = await accessiblePaper(userId, paperId, isAdmin);
  if (!paper._count.questions) throw new AppError('Bài kiểm tra chưa có câu hỏi.', 400);
  const activeKey = `${userId}:${paperId}`;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.enTestPaperAttempt.findUnique({ where: { activeKey }, include: { items: { orderBy: { position: 'asc' } } } });
      if (existing) return publicAttempt(existing);
      const questions = await tx.enTestPaperQuestion.findMany({ where: { paperId }, orderBy: { position: 'asc' } });
      if (!questions.length) throw new AppError('Bài kiểm tra chưa có câu hỏi.', 400);
      const attempt = await tx.enTestPaperAttempt.create({ data: { userId, paperId, activeKey, total: questions.length } });
      await tx.enTestPaperAttemptItem.createMany({ data: questions.map((question) => ({ attemptId: attempt.id, position: question.position, type: question.type, prompt: question.prompt, options: question.options, correctIndex: question.correctIndex, answers: question.answers, explanationVi: question.explanationVi })) });
      const items = await tx.enTestPaperAttemptItem.findMany({ where: { attemptId: attempt.id }, orderBy: { position: 'asc' } });
      return publicAttempt({ ...attempt, items });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.enTestPaperAttempt.findUnique({ where: { activeKey }, include: { items: { orderBy: { position: 'asc' } } } });
      if (existing) return publicAttempt(existing);
    }
    throw error;
  }
}
export async function answerTestPaper(userId: string, attemptId: string, position: number, answer: string): Promise<{ saved: true }> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.enTestPaperAttempt.findFirst({ where: { id: attemptId, userId, status: 'in_progress' }, include: { items: { where: { position } } } });
    if (!attempt) throw new AppError('Không tìm thấy lượt làm bài', 404);
    const item = attempt.items[0];
    if (!item) throw new AppError('Câu trả lời không hợp lệ', 400);
    const value = answer.trim();
    if (value && item.type === 'mcq' && (!/^[0-5]$/.test(value) || Number(value) >= item.options.length)) throw new AppError('Câu trả lời không hợp lệ', 400);
    await tx.enTestPaperAttemptItem.update({ where: { id: item.id }, data: { answer: value || null, correct: value ? gradeTestAnswer(item, value) : null, answeredAt: value ? new Date() : null } });
    await tx.enTestPaperAttempt.update({ where: { id: attempt.id }, data: { position } });
    return { saved: true };
  });
}
function resultOf(attempt: AttemptWithPaper): TestResult {
  const score = attempt.score ?? attempt.items.filter((item) => item.correct).length;
  return { attemptId: attempt.id, paperId: attempt.paperId, subjectId: attempt.paper.subjectId, score, total: attempt.total, percent: testPercent(score, attempt.total), passed: isTestPassed(score, attempt.total), items: [...attempt.items].sort((a, b) => a.position - b.position).map((item) => ({ position: item.position, type: item.type, prompt: item.prompt, options: item.options, answer: item.answer, correct: item.correct ?? false, correctText: item.type === 'mcq' ? item.options[item.correctIndex ?? -1] ?? '' : item.answers.join(' / '), explanationVi: item.explanationVi })) };
}
export async function finishTestPaper(userId: string, attemptId: string): Promise<TestResult> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.enTestPaperAttempt.findFirst({ where: { id: attemptId, userId }, include: { items: true, paper: { select: { subjectId: true } } } });
    if (!attempt) throw new AppError('Không tìm thấy lượt làm bài', 404);
    if (attempt.status === 'finished') return resultOf(attempt);
    await tx.enTestPaperAttemptItem.updateMany({ where: { attemptId, answer: null }, data: { correct: false } });
    const score = attempt.items.filter((item) => item.correct).length;
    const updated = await tx.enTestPaperAttempt.update({ where: { id: attemptId }, data: { status: 'finished', score, finishedAt: new Date(), activeKey: null }, include: { items: true, paper: { select: { subjectId: true } } } });
    return resultOf(updated);
  });
}

export async function getTestResult(userId: string, attemptId: string): Promise<TestResult & { paperTitle: string; subjectTitle: string; day: string }> {
  const attempt = await prisma.enTestPaperAttempt.findFirst({ where: { id: attemptId, userId, status: 'finished' }, include: { items: true, paper: { select: { subjectId: true, title: true, subject: { select: { title: true } } } } } });
  if (!attempt) throw new AppError('Không tìm thấy lượt làm bài', 404);
  return { ...resultOf(attempt), paperTitle: attempt.paper.title, subjectTitle: attempt.paper.subject.title, day: formatVnDay(vnDayKey(attempt.finishedAt ?? attempt.startedAt)) };
}
export async function listMyTestResults(userId: string): Promise<Array<{ attemptId: string; paperTitle: string; subjectTitle: string; score: number; total: number; percent: number; passed: boolean; day: string }>> {
  const attempts = await prisma.enTestPaperAttempt.findMany({ where: { userId, status: 'finished', score: { not: null } }, orderBy: { finishedAt: 'desc' }, take: 100, include: { paper: { select: { title: true, subject: { select: { title: true } } } } } });
  return attempts.map((attempt) => ({ attemptId: attempt.id, paperTitle: attempt.paper.title, subjectTitle: attempt.paper.subject.title, score: attempt.score!, total: attempt.total, percent: testPercent(attempt.score!, attempt.total), passed: isTestPassed(attempt.score!, attempt.total), day: formatVnDay(vnDayKey(attempt.finishedAt ?? attempt.startedAt)) }));
}
