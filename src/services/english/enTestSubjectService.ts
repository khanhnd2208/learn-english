import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { accessCodeMatches } from '@/lib/accessCode';
import { isTestPassed, pickBestAttempt } from '@/lib/english/testPaper';
import { courseProgress } from '@/lib/english/testCourse';
import { EN_TEST_PASS_PERCENT } from '@/lib/english/constants';

export interface TestSubjectSummary {
  id: string; title: string; description: string; status: string; listed: boolean;
  locked: boolean; enrolled: boolean; papers: number; passed: number; accessCode?: string | null; learners?: number;
}
export interface TestPaperRow {
  id: string; title: string; description?: string; status: string; questionCount: number;
  inProgress: boolean; best: { score: number; total: number; passed: boolean } | null; attempts: number;
}
export interface TestSubjectDetail extends Omit<TestSubjectSummary, 'papers' | 'passed'> { papers: TestPaperRow[]; progress: { passed: number; total: number; nextId: string | null } }
export interface AdminTestSubject extends TestSubjectSummary { papersList: TestPaperRow[] }

const NOT_FOUND = 'Không tìm thấy môn học';
const visibleToLearner = (userId: string) => ({ OR: [
  { status: 'published' as const, listed: true, papers: { some: { status: 'published' as const, questions: { some: {} } } } },
  { enrollments: { some: { userId } } },
] });

export async function listTestSubjects(userId: string, isAdmin: boolean): Promise<TestSubjectSummary[]> {
  const subjects = await prisma.enTestSubject.findMany({
    where: isAdmin ? {} : visibleToLearner(userId),
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      enrollments: { where: { userId }, select: { id: true } },
      _count: { select: { enrollments: true } },
      papers: { where: { status: 'published', questions: { some: {} } }, select: { id: true, attempts: { where: { userId, status: 'finished' }, select: { score: true, total: true } } } },
    },
  });
  return subjects.map((subject) => ({
    id: subject.id, title: subject.title, description: subject.description, status: subject.status,
    listed: subject.listed, locked: subject.accessCode != null, enrolled: subject.enrollments.length > 0,
    papers: subject.papers.length,
    passed: subject.papers.filter((paper) => paper.attempts.some((attempt) => attempt.score !== null && isTestPassed(attempt.score, attempt.total))).length,
    ...(isAdmin ? { accessCode: subject.accessCode, learners: subject._count.enrollments } : {}),
  }));
}

export async function testPaperRows(userId: string, subjectId: string, isAdmin: boolean): Promise<TestPaperRow[]> {
  const papers = await prisma.enTestPaper.findMany({
    where: { subjectId, ...(isAdmin ? {} : { status: 'published', questions: { some: {} } }) },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { questions: true } }, attempts: { where: { userId }, select: { status: true, score: true, total: true, finishedAt: true } } },
  });
  return papers.map((paper) => {
    const finished = paper.attempts.filter((attempt): attempt is typeof attempt & { score: number; finishedAt: Date } => attempt.status === 'finished' && attempt.score !== null && attempt.finishedAt !== null);
    const best = pickBestAttempt(finished);
    return {
      id: paper.id, title: paper.title, status: paper.status, questionCount: paper._count.questions,
      inProgress: paper.attempts.some((attempt) => attempt.status === 'in_progress'),
      best: best ? { score: best.score, total: best.total, passed: isTestPassed(best.score, best.total) } : null,
      attempts: finished.length,
      ...(isAdmin ? { description: paper.description } : {}),
    };
  });
}

export async function getTestSubjectDetail(userId: string, subjectId: string, isAdmin: boolean): Promise<TestSubjectDetail> {
  const subject = await prisma.enTestSubject.findUnique({
    where: { id: subjectId },
    include: { enrollments: { where: { userId }, select: { id: true } }, _count: { select: { enrollments: true } }, papers: { where: { status: 'published', questions: { some: {} } }, select: { id: true } } },
  });
  if (!subject) throw new AppError(NOT_FOUND, 404);
  const enrolled = subject.enrollments.length > 0;
  if (!isAdmin && !enrolled && (subject.status !== 'published' || !subject.listed || !subject.papers.length)) throw new AppError(NOT_FOUND, 404);
  const papers = await testPaperRows(userId, subjectId, isAdmin);
  const learnerPapers = papers.filter((paper) => paper.status === 'published' && paper.questionCount > 0);
  return {
    id: subject.id, title: subject.title, description: subject.description, status: subject.status,
    listed: subject.listed, locked: subject.accessCode != null, enrolled,
    papers,
    progress: courseProgress(learnerPapers.map((paper) => ({ id: paper.id, bestPercent: paper.best ? paper.best.score * 100 / paper.best.total : null })), EN_TEST_PASS_PERCENT),
    ...(isAdmin ? { accessCode: subject.accessCode, learners: subject._count.enrollments } : {}),
  };
}

export async function enrollTestSubject(userId: string, subjectId: string, accessCode?: string) {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.enTestSubject.findUnique({ where: { id: subjectId }, include: { enrollments: { where: { userId } } } });
    if (!subject || subject.status !== 'published') throw new AppError('Môn học chưa xuất bản', 404);
    if (!subject.enrollments.length) {
      if (!subject.listed) throw new AppError('Môn học không còn mở đăng ký', 404);
      if (subject.accessCode != null && (typeof accessCode !== 'string' || !accessCodeMatches(subject.accessCode, accessCode))) throw new AppError('Mật khẩu không đúng', 403, 'ACCESS_CODE');
    }
    await tx.enTestSubjectEnrollment.upsert({ where: { userId_subjectId: { userId, subjectId } }, create: { userId, subjectId }, update: {} });
    return { enrolled: true };
  });
}
export async function leaveTestSubject(userId: string, subjectId: string) {
  await prisma.enTestSubjectEnrollment.deleteMany({ where: { userId, subjectId } });
  return { enrolled: false };
}

export async function createTestSubject(input: { title: string; description: string }) {
  const last = await prisma.enTestSubject.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  return prisma.enTestSubject.create({ data: { ...input, sortOrder: (last?.sortOrder ?? -1) + 1 } });
}
export async function updateTestSubject(subjectId: string, input: { title?: string; description?: string; listed?: boolean; accessCode?: string; status?: 'draft' | 'published' }) {
  return prisma.enTestSubject.update({ where: { id: subjectId }, data: { ...input, ...(input.accessCode !== undefined ? { accessCode: input.accessCode.trim() || null } : {}) } });
}
export async function deleteTestSubject(subjectId: string) {
  const count = await prisma.enTestPaper.count({ where: { subjectId } });
  if (count) throw new AppError('Hãy xóa hết bài kiểm tra của môn trước khi xóa.', 400);
  await prisma.enTestSubject.delete({ where: { id: subjectId } });
  return { deleted: true };
}

export async function listAdminTestSubjects(): Promise<AdminTestSubject[]> {
  const summaries = await listTestSubjects('', true);
  const rows = await Promise.all(summaries.map((summary) => testPaperRows('', summary.id, true)));
  return summaries.map((summary, index) => ({ ...summary, papersList: rows[index]! }));
}
