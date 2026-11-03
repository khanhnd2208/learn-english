import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { accessCodeMatches } from '@/lib/accessCode';
import { listEnglishSets } from '@/services/english/enCatalogService';

export interface VocabSubjectSummary {
  id: string; title: string; description: string; status: string; listed: boolean;
  locked: boolean; enrolled: boolean; sets: number; words: number;
  accessCode?: string | null; learners?: number;
}
export interface VocabSubjectSet {
  setId: string; number: number; title: string; status: string; words: number; learned: number; longTerm: number;
}
export interface VocabSubjectDetail extends Omit<VocabSubjectSummary, 'sets'> {
  learned: number; longTerm: number; sets: VocabSubjectSet[];
}
export interface AdminVocabSubject extends VocabSubjectSummary {
  setsList: Array<{ id: string; title: string; status: string; sortOrder: number }>;
}
export interface AdminVocabSubjectsData { subjects: AdminVocabSubject[]; unassignedSets: Array<{ id: string; title: string; status: string }> }

export async function syncSubjectEnrollments(tx: Prisma.TransactionClient, subjectId: string): Promise<void> {
  const [enrollments, sets] = await Promise.all([
    tx.enVocabSubjectEnrollment.findMany({ where: { subjectId }, select: { userId: true } }),
    tx.enSet.findMany({ where: { subjectId, status: 'published' }, select: { id: true } }),
  ]);
  const data = enrollments.flatMap(({ userId }) => sets.map(({ id: setId }) => ({ userId, setId })));
  if (data.length) await tx.enEnrollment.createMany({ data, skipDuplicates: true });
}

export async function listVocabSubjects(userId: string, isAdmin: boolean): Promise<VocabSubjectSummary[]> {
  const subjects = await prisma.enVocabSubject.findMany({
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
  const ids = subjects.map((subject) => subject.id);
  const counts = ids.length ? await prisma.$queryRaw<Array<{ subjectId: string; words: number }>>(Prisma.sql`
    SELECT s."subjectId", count(i."senseId")::int AS words
    FROM "EnSet" s JOIN "EnSetItem" i ON i."setId" = s."id"
    JOIN "EnSense" se ON se."id" = i."senseId" AND se."status" = 'published'
    WHERE s."subjectId" = ANY(${ids}::text[]) AND s."status" = 'published'
    GROUP BY s."subjectId"`) : [];
  const bySubject = new Map(counts.map((row) => [row.subjectId, row.words]));
  return subjects.map((subject) => ({
    id: subject.id, title: subject.title, description: subject.description, status: subject.status,
    listed: subject.listed, locked: subject.accessCode != null, enrolled: subject.enrollments.length > 0,
    sets: subject.sets.length, words: bySubject.get(subject.id) ?? 0,
    ...(isAdmin ? { accessCode: subject.accessCode, learners: subject._count.enrollments } : {}),
  }));
}

export async function getVocabSubjectDetail(userId: string, subjectId: string, isAdmin: boolean): Promise<VocabSubjectDetail> {
  const subject = await prisma.enVocabSubject.findUnique({
    where: { id: subjectId },
    include: { enrollments: { where: { userId }, select: { id: true } },
      sets: { where: isAdmin ? {} : { status: 'published' }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true, title: true, status: true } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!subject) throw new AppError('Không tìm thấy môn học', 404);
  const enrolled = subject.enrollments.length > 0;
  if (!isAdmin && !enrolled && (subject.status !== 'published' || !subject.listed || !subject.sets.length)) throw new AppError('Không tìm thấy môn học', 404);
  // Count only this subject's sets, not every set in the catalog.
  const setIds = subject.sets.map((set) => set.id);
  const summaries = setIds.length ? await listEnglishSets(userId, isAdmin, { setIds }) : [];
  const bySet = new Map(summaries.map((set) => [set.id, set]));
  const sets = subject.sets.map((set, index) => ({
    setId: set.id, number: index + 1, title: set.title, status: set.status,
    words: bySet.get(set.id)?.words ?? 0, learned: bySet.get(set.id)?.learned ?? 0,
    longTerm: bySet.get(set.id)?.longTerm ?? 0,
  }));
  return {
    id: subject.id, title: subject.title, description: subject.description, status: subject.status,
    listed: subject.listed, locked: subject.accessCode != null, enrolled,
    words: sets.reduce((sum, set) => sum + set.words, 0),
    learned: sets.reduce((sum, set) => sum + set.learned, 0),
    longTerm: sets.reduce((sum, set) => sum + set.longTerm, 0),
    sets,
    ...(isAdmin ? { accessCode: subject.accessCode, learners: subject._count.enrollments } : {}),
  };
}

export async function enrollVocabSubject(userId: string, subjectId: string, accessCode?: string) {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.enVocabSubject.findUnique({ where: { id: subjectId }, include: { enrollments: { where: { userId } } } });
    if (!subject || subject.status !== 'published') throw new AppError('Môn học chưa xuất bản', 404);
    if (!subject.enrollments.length) {
      if (!subject.listed) throw new AppError('Môn học không còn mở đăng ký', 404);
      if (subject.accessCode != null && (typeof accessCode !== 'string' || !accessCodeMatches(subject.accessCode, accessCode))) throw new AppError('Mật khẩu không đúng', 403, 'ACCESS_CODE');
    }
    await tx.enVocabSubjectEnrollment.upsert({ where: { userId_subjectId: { userId, subjectId } }, create: { userId, subjectId }, update: {} });
    await syncSubjectEnrollments(tx, subjectId);
    return { enrolled: true };
  });
}

export async function leaveVocabSubject(userId: string, subjectId: string) {
  return prisma.$transaction(async (tx) => {
    const sets = await tx.enSet.findMany({ where: { subjectId }, select: { id: true } });
    await tx.enVocabSubjectEnrollment.deleteMany({ where: { userId, subjectId } });
    await tx.enEnrollment.deleteMany({ where: { userId, setId: { in: sets.map((set) => set.id) } } });
    return { enrolled: false };
  });
}

export async function createVocabSubject(input: { title: string; description: string }) {
  const last = await prisma.enVocabSubject.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  return prisma.enVocabSubject.create({ data: { ...input, sortOrder: (last?.sortOrder ?? -1) + 1 } });
}
export async function updateVocabSubject(subjectId: string, input: { title?: string; description?: string; listed?: boolean; accessCode?: string; status?: 'draft' | 'published' }) {
  return prisma.enVocabSubject.update({ where: { id: subjectId }, data: { ...input, ...(input.accessCode !== undefined ? { accessCode: input.accessCode.trim() || null } : {}) } });
}
export async function deleteVocabSubject(subjectId: string) {
  const count = await prisma.enSet.count({ where: { subjectId } });
  if (count) throw new AppError('Hãy gỡ hết bộ từ khỏi môn trước khi xóa.', 400);
  await prisma.enVocabSubject.delete({ where: { id: subjectId } });
  return { deleted: true };
}
export async function addSetToSubject(subjectId: string, setId: string) {
  return prisma.$transaction(async (tx) => {
    const set = await tx.enSet.findUnique({ where: { id: setId } });
    if (!set) throw new AppError('Không tìm thấy bộ học', 404);
    if (set.subjectId && set.subjectId !== subjectId) throw new AppError('Bộ này đang thuộc môn khác. Hãy gỡ khỏi môn đó trước.', 400);
    const last = await tx.enSet.findFirst({ where: { subjectId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const updated = await tx.enSet.update({ where: { id: setId }, data: { subjectId, sortOrder: (last?.sortOrder ?? -1) + 1 } });
    if (updated.status === 'published') await syncSubjectEnrollments(tx, subjectId);
    return updated;
  });
}
export async function removeSetFromSubject(subjectId: string, setId: string) {
  return prisma.$transaction(async (tx) => {
    const set = await tx.enSet.findFirst({ where: { id: setId, subjectId }, select: { id: true } });
    if (!set) throw new AppError('Không tìm thấy bộ học', 404);
    return tx.enSet.update({ where: { id: setId }, data: { subjectId: null } });
  });
}
export async function moveSubjectSet(subjectId: string, setId: string, direction: 'up' | 'down') {
  return prisma.$transaction(async (tx) => {
    const sets = await tx.enSet.findMany({ where: { subjectId }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true } });
    const index = sets.findIndex((set) => set.id === setId);
    if (index < 0) throw new AppError('Không tìm thấy bộ học', 404);
    const next = index + (direction === 'up' ? -1 : 1);
    if (next < 0 || next >= sets.length) return { moved: false };
    [sets[index], sets[next]] = [sets[next], sets[index]];
    for (const [sortOrder, set] of sets.entries()) await tx.enSet.update({ where: { id: set.id }, data: { sortOrder } });
    return { moved: true };
  });
}
export async function listAdminVocabSubjects(): Promise<AdminVocabSubjectsData> {
  const [summaries, subjects, unassignedSets] = await Promise.all([
    listVocabSubjects('', true),
    prisma.enVocabSubject.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], include: { sets: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true, title: true, status: true, sortOrder: true } } } }),
    prisma.enSet.findMany({ where: { subjectId: null }, orderBy: { title: 'asc' }, select: { id: true, title: true, status: true } }),
  ]);
  const byId = new Map(summaries.map((summary) => [summary.id, summary]));
  return { subjects: subjects.map((subject) => ({ ...byId.get(subject.id)!, setsList: subject.sets })), unassignedSets };
}
