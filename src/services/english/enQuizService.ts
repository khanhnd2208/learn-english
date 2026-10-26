import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { activityByKey, poolFromBundles, randomRng, type ActivityItem } from '@/lib/english/activities';
import { EN_QUIZ_MAX_ITEMS } from '@/lib/english/constants';
import { pickQuizSenses, quizItemFor, isQuizKind, type QuizKind } from '@/lib/english/quiz';
import { vnDayKey, shiftVnDay } from '@/lib/english/gapRule';
import { vnDayStart } from '@/lib/english/schedule';
import { getSenseBundles } from '@/services/english/enContentService';
import { assertEnrolled } from '@/services/english/enCatalogService';

const blueprint = (value: unknown): { kind?: string; v?: number } => value && typeof value === 'object' ? value as { kind?: string; v?: number } : {};
const publicItems = (items: Array<{ position: number; activityKey: string; prompt: unknown; answer: string | null }>) => items.sort((a, b) => a.position - b.position).map((item) => ({ position: item.position, activityKey: item.activityKey, prompt: item.prompt as Record<string, unknown>, answer: item.answer }));

export async function startQuiz(userId: string, setId: string, kind: QuizKind, restart = false, now = new Date()) {
 await assertEnrolled(userId, setId);
 const since = vnDayStart(vnDayKey(now));
 if (!restart) {
  const attempts = await prisma.enTestAttempt.findMany({ where: { userId, setId, mode: 'set', status: 'in_progress', startedAt: { gte: since } }, orderBy: { startedAt: 'desc' }, include: { items: true } });
  const existing = attempts.find((attempt) => blueprint(attempt.blueprint).v === 2 && blueprint(attempt.blueprint).kind === kind);
  if (existing) return { attemptId: existing.id, items: publicItems(existing.items), resumed: true, wordCount: existing.wordCount };
 }
 const setItems = await prisma.enSetItem.findMany({ where: { setId, sense: { status: 'published' } }, orderBy: { position: 'asc' }, select: { senseId: true } });
 const setIds = [...new Set(setItems.flatMap((item) => item.senseId ? [item.senseId] : []))];
 if (!setIds.length) throw new AppError('Bộ này chưa có từ để kiểm tra', 400);
 const enrollments = await prisma.enEnrollment.findMany({ where: { userId }, select: { setId: true } });
 const poolItems = await prisma.enSetItem.findMany({ where: { setId: { in: enrollments.map((row) => row.setId) }, sense: { status: 'published' } }, select: { senseId: true } });
 const poolIds = [...new Set([...setIds, ...poolItems.flatMap((item) => item.senseId ? [item.senseId] : [])])];
 const [bundles, states] = await Promise.all([
  getSenseBundles(poolIds, true),
  prisma.enWordState.findMany({ where: { userId, senseId: { in: setIds } }, select: { senseId: true, lapses: true, box: true } }),
 ]);
 const byId = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
 const stateById = new Map(states.map((state) => [state.senseId, state]));
 const rng = randomRng();
 const chosen = pickQuizSenses(setIds.map((senseId) => ({ senseId, lapses: stateById.get(senseId)?.lapses ?? 0, box: stateById.get(senseId)?.box ?? 0 })), EN_QUIZ_MAX_ITEMS, rng);
 const pool = poolFromBundles(bundles, { sameSetIds: new Set(setIds) });
 const items = chosen.flatMap(({ senseId }) => {
  const bundle = byId.get(senseId);
  const item = bundle && quizItemFor(kind, bundle, { pool, rng, allowSyntheticAudio: true });
  return item ? [item] : [];
 });
 if (!items.length) throw new AppError('Không dựng được câu hỏi cho bộ này', 400);
 const attempt = await prisma.enTestAttempt.create({ data: { userId, mode: 'set', setId, blueprint: { kind, v: 2 }, status: 'in_progress', startedAt: now, wordCount: items.length, items: { create: items.map((item, position) => ({ senseId: item.senseId, position, role: item.role, activityKey: item.activityKey, prompt: item.prompt as Prisma.InputJsonValue, answerKey: item.answerKey, accepted: item.accepted })) } }, include: { items: true } });
 return { attemptId: attempt.id, items: publicItems(attempt.items), resumed: false, wordCount: attempt.wordCount };
}

export async function answerQuiz(userId: string, attemptId: string, position: number, answer: string, responseMs: number) {
 const attempt = await prisma.enTestAttempt.findFirst({ where: { id: attemptId, userId }, include: { items: true } });
 if (!attempt || blueprint(attempt.blueprint).v !== 2) throw new AppError('Không tìm thấy bài kiểm tra', 404);
 if (attempt.status !== 'in_progress') throw new AppError('Bài đã nộp', 409);
 const item = attempt.items.find((entry) => entry.position === position);
 if (!item) throw new AppError('Không tìm thấy câu hỏi', 404);
 if (item.answer !== null) return { position, answer: item.answer, saved: true };
 const activity = activityByKey(item.activityKey);
 const correct = answer.trim() !== '' && Boolean(activity?.grade?.({ activityKey: item.activityKey as ActivityItem['activityKey'], role: item.role as ActivityItem['role'], senseId: item.senseId, prompt: item.prompt as Record<string, unknown>, answerKey: item.answerKey, accepted: item.accepted }, answer));
 await prisma.enTestItem.update({ where: { id: item.id }, data: { answer, correct, responseMs: Math.max(0, Math.min(120_000, Math.trunc(responseMs))), answeredAt: new Date() } });
 return { position, answer, saved: true };
}

export async function finishQuiz(userId: string, attemptId: string, now = new Date()) {
 const attempt = await prisma.enTestAttempt.findFirst({ where: { id: attemptId, userId }, include: { items: true } });
 if (!attempt || blueprint(attempt.blueprint).v !== 2) throw new AppError('Không tìm thấy bài kiểm tra', 404);
 const passedCount = attempt.items.filter((item) => item.correct).length;
 if (attempt.status === 'in_progress') await prisma.enTestAttempt.update({ where: { id: attempt.id }, data: { status: 'finished', finishedAt: now, passedCount } });
 return { attemptId, passedCount, wordCount: attempt.wordCount, items: attempt.items.sort((a, b) => a.position - b.position).map((item) => ({ position: item.position, senseId: item.senseId, prompt: item.prompt, answer: item.answer, answerKey: item.answerKey, correct: item.correct === true })) };
}

export async function getDailyTasks(userId: string, now = new Date()) {
 const since = vnDayStart(vnDayKey(now));
 const until = vnDayStart(shiftVnDay(vnDayKey(now), 1));
 const attempts = await prisma.enTestAttempt.findMany({ where: { userId, mode: 'set', status: 'finished', finishedAt: { gte: since, lt: until } }, select: { id: true, setId: true, blueprint: true, passedCount: true, wordCount: true } });
 const ids = [...new Set(attempts.flatMap((attempt) => attempt.setId ? [attempt.setId] : []))];
 const sets = await prisma.enSet.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
 const titles = new Map(sets.map((set) => [set.id, set.title]));
 const tasks: Partial<Record<QuizKind, { passedCount: number; wordCount: number; setId: string; setTitle: string }>> = {};
 for (const attempt of attempts) {
  const data = blueprint(attempt.blueprint);
  if (data.v !== 2 || !data.kind || !isQuizKind(data.kind) || !attempt.setId) continue;
  const previous = tasks[data.kind];
  if (!previous || (attempt.passedCount ?? 0) / attempt.wordCount > previous.passedCount / previous.wordCount) tasks[data.kind] = { passedCount: attempt.passedCount ?? 0, wordCount: attempt.wordCount, setId: attempt.setId, setTitle: titles.get(attempt.setId) ?? 'Bộ từ' };
 }
 return tasks;
}
