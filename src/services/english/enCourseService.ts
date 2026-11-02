import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { accessCodeMatches, listEnglishSets } from '@/services/english/enCatalogService';
import { courseExamRows } from '@/services/english/enExamService';

export interface CourseSummary {
  id: string; title: string; description: string; status: string; listed: boolean;
  locked: boolean; enrolled: boolean; lessons: number; words: number; exams: number;
  accessCode?: string | null; learners?: number;
}
export interface CourseLesson {
  setId: string; number: number; title: string; status: string; words: number; learned: number; longTerm: number;
}
export interface CourseExamRow {
  id: string; title: string; setId: string | null; lessonNumber: number | null;
  lessonTitle: string | null; status: string; questionCount: number;
  inProgress: boolean; best: { score: number; total: number; passed: boolean } | null; attempts: number;
}
export interface CourseDetail extends Omit<CourseSummary, 'lessons' | 'exams'> {
  learned: number; longTerm: number; lessons: CourseLesson[]; exams: CourseExamRow[];
}
export interface AdminCourse extends CourseSummary {
  lessonsList: Array<{ id: string; title: string; status: string; sortOrder: number }>;
  examsList: CourseExamRow[];
}
export interface AdminCoursesData { courses: AdminCourse[]; unassignedSets: Array<{ id: string; title: string; status: string }> }

export async function syncCourseEnrollments(tx: Prisma.TransactionClient, courseId: string): Promise<void> {
  const [enrollments, sets] = await Promise.all([
    tx.enCourseEnrollment.findMany({ where: { courseId }, select: { userId: true } }),
    tx.enSet.findMany({ where: { courseId, status: 'published' }, select: { id: true } }),
  ]);
  const data = enrollments.flatMap(({ userId }) => sets.map(({ id: setId }) => ({ userId, setId })));
  if (data.length) await tx.enEnrollment.createMany({ data, skipDuplicates: true });
}

export async function listCourses(userId: string, isAdmin: boolean): Promise<CourseSummary[]> {
  const courses = await prisma.enCourse.findMany({
    where: isAdmin ? {} : { OR: [
      { status: 'published', listed: true, sets: { some: { status: 'published' } } },
      { enrollments: { some: { userId } } },
    ] },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      enrollments: { where: { userId }, select: { id: true } },
      _count: { select: { enrollments: true } },
      sets: { where: { status: 'published' }, select: { id: true } },
    },
  });
  const ids = courses.map((course) => course.id);
  const counts = ids.length ? await prisma.$queryRaw<Array<{ courseId: string; words: number }>>(Prisma.sql`
    SELECT s."courseId", count(i."senseId")::int AS words
    FROM "EnSet" s JOIN "EnSetItem" i ON i."setId" = s."id"
    JOIN "EnSense" se ON se."id" = i."senseId" AND se."status" = 'published'
    WHERE s."courseId" = ANY(${ids}::text[]) AND s."status" = 'published'
    GROUP BY s."courseId"`) : [];
  const byCourse = new Map(counts.map((row) => [row.courseId, row.words]));
  const exams = ids.length ? await prisma.enExam.findMany({ where: { courseId: { in: ids }, status: 'published', questions: { some: {} }, OR: [{ setId: null }, { set: { status: 'published' } }] }, select: { courseId: true } }) : [];
  const examCount = new Map<string, number>();
  for (const exam of exams) examCount.set(exam.courseId, (examCount.get(exam.courseId) ?? 0) + 1);
  return courses.map((course) => ({
    id: course.id, title: course.title, description: course.description, status: course.status,
    listed: course.listed, locked: course.accessCode != null, enrolled: course.enrollments.length > 0,
    lessons: course.sets.length, words: byCourse.get(course.id) ?? 0, exams: examCount.get(course.id) ?? 0,
    ...(isAdmin ? { accessCode: course.accessCode, learners: course._count.enrollments } : {}),
  }));
}

export async function getCourseDetail(userId: string, courseId: string, isAdmin: boolean): Promise<CourseDetail> {
  const course = await prisma.enCourse.findUnique({
    where: { id: courseId },
    include: { enrollments: { where: { userId }, select: { id: true } },
      sets: { where: isAdmin ? {} : { status: 'published' }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true, title: true, status: true } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) throw new AppError('Không tìm thấy khóa học', 404);
  const enrolled = course.enrollments.length > 0;
  if (!isAdmin && !enrolled && (course.status !== 'published' || !course.listed || !course.sets.length)) throw new AppError('Không tìm thấy khóa học', 404);
  const summaries = await listEnglishSets(userId, isAdmin);
  const bySet = new Map(summaries.map((set) => [set.id, set]));
  const lessons = course.sets.map((set, index) => ({
    setId: set.id, number: index + 1, title: set.title, status: set.status,
    words: bySet.get(set.id)?.words ?? 0, learned: bySet.get(set.id)?.learned ?? 0,
    longTerm: bySet.get(set.id)?.longTerm ?? 0,
  }));
  return {
    id: course.id, title: course.title, description: course.description, status: course.status,
    listed: course.listed, locked: course.accessCode != null, enrolled,
    words: lessons.reduce((sum, lesson) => sum + lesson.words, 0),
    learned: lessons.reduce((sum, lesson) => sum + lesson.learned, 0),
    longTerm: lessons.reduce((sum, lesson) => sum + lesson.longTerm, 0),
    lessons, exams: await courseExamRows(userId, courseId, isAdmin),
    ...(isAdmin ? { accessCode: course.accessCode, learners: course._count.enrollments } : {}),
  };
}

export async function enrollCourse(userId: string, courseId: string, accessCode?: string) {
  return prisma.$transaction(async (tx) => {
    const course = await tx.enCourse.findUnique({ where: { id: courseId }, include: { enrollments: { where: { userId } } } });
    if (!course || course.status !== 'published') throw new AppError('Khóa học chưa xuất bản', 404);
    if (!course.enrollments.length) {
      if (!course.listed) throw new AppError('Khóa học không còn mở đăng ký', 404);
      if (course.accessCode != null && (typeof accessCode !== 'string' || !accessCodeMatches(course.accessCode, accessCode))) throw new AppError('Mật khẩu không đúng', 403, 'ACCESS_CODE');
    }
    await tx.enCourseEnrollment.upsert({ where: { userId_courseId: { userId, courseId } }, create: { userId, courseId }, update: {} });
    await syncCourseEnrollments(tx, courseId);
    return { enrolled: true };
  });
}

export async function leaveCourse(userId: string, courseId: string) {
  return prisma.$transaction(async (tx) => {
    const sets = await tx.enSet.findMany({ where: { courseId }, select: { id: true } });
    await tx.enCourseEnrollment.deleteMany({ where: { userId, courseId } });
    await tx.enEnrollment.deleteMany({ where: { userId, setId: { in: sets.map((set) => set.id) } } });
    return { enrolled: false };
  });
}

export async function createCourse(input: { title: string; description: string }) {
  const last = await prisma.enCourse.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  return prisma.enCourse.create({ data: { ...input, sortOrder: (last?.sortOrder ?? -1) + 1 } });
}
export async function updateCourse(courseId: string, input: { title?: string; description?: string; listed?: boolean; accessCode?: string; status?: 'draft' | 'published' }) {
  return prisma.enCourse.update({ where: { id: courseId }, data: { ...input, ...(input.accessCode !== undefined ? { accessCode: input.accessCode.trim() || null } : {}) } });
}
export async function deleteCourse(courseId: string) {
  const count = await prisma.enSet.count({ where: { courseId } });
  if (count) throw new AppError('Hãy gỡ hết bài khỏi khóa trước khi xóa.', 400);
  await prisma.enCourse.delete({ where: { id: courseId } });
  return { deleted: true };
}
export async function addSetToCourse(courseId: string, setId: string) {
  return prisma.$transaction(async (tx) => {
    const set = await tx.enSet.findUnique({ where: { id: setId } });
    if (!set) throw new AppError('Không tìm thấy bộ học', 404);
    if (set.courseId && set.courseId !== courseId) throw new AppError('Bài này đang thuộc khóa khác. Hãy gỡ khỏi khóa đó trước.', 400);
    const last = await tx.enSet.findFirst({ where: { courseId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const updated = await tx.enSet.update({ where: { id: setId }, data: { courseId, sortOrder: (last?.sortOrder ?? -1) + 1 } });
    if (updated.status === 'published') await syncCourseEnrollments(tx, courseId);
    return updated;
  });
}
export async function removeSetFromCourse(courseId: string, setId: string) {
  return prisma.$transaction(async (tx) => {
    const set = await tx.enSet.findFirst({ where: { id: setId, courseId }, select: { id: true } });
    if (!set) throw new AppError('Không tìm thấy bộ học', 404);
    await tx.enExam.updateMany({ where: { courseId, setId }, data: { setId: null } });
    return tx.enSet.update({ where: { id: setId }, data: { courseId: null } });
  });
}
export async function moveLesson(courseId: string, setId: string, direction: 'up' | 'down') {
  return prisma.$transaction(async (tx) => {
    const sets = await tx.enSet.findMany({ where: { courseId }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true } });
    const index = sets.findIndex((set) => set.id === setId);
    if (index < 0) throw new AppError('Không tìm thấy bộ học', 404);
    const next = index + (direction === 'up' ? -1 : 1);
    if (next < 0 || next >= sets.length) return { moved: false };
    [sets[index], sets[next]] = [sets[next], sets[index]];
    for (const [sortOrder, set] of sets.entries()) await tx.enSet.update({ where: { id: set.id }, data: { sortOrder } });
    return { moved: true };
  });
}
export async function listAdminCourses(): Promise<AdminCoursesData> {
  const [summaries, courses, unassignedSets] = await Promise.all([
    listCourses('', true),
    prisma.enCourse.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], include: { sets: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true, title: true, status: true, sortOrder: true } } } }),
    prisma.enSet.findMany({ where: { courseId: null }, orderBy: { title: 'asc' }, select: { id: true, title: true, status: true } }),
  ]);
  const byId = new Map(summaries.map((summary) => [summary.id, summary]));
  const examRows = await Promise.all(courses.map((course) => courseExamRows('', course.id, true)));
  return { courses: courses.map((course, index) => ({ ...byId.get(course.id)!, lessonsList: course.sets, examsList: examRows[index]! })), unassignedSets };
}
