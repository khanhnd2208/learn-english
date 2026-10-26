import { describe, expect, it, vi } from 'vitest';
import { getDailyTasks } from '@/services/english/enQuizService';
const mocks = vi.hoisted(() => ({ attempts: vi.fn(), sets: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enTestAttempt: { findMany: mocks.attempts }, enSet: { findMany: mocks.sets } } }));
vi.mock('@/services/english/enCatalogService', () => ({ assertEnrolled: vi.fn() }));
describe('daily quiz tasks', () => {
 it('counts only submitted v2 quizzes on the Vietnam day and keeps the best score', async () => {
  mocks.attempts.mockResolvedValue([
   { id: 'a', setId: 's1', blueprint: { kind: 'mcq', v: 2 }, passedCount: 12, wordCount: 20 },
   { id: 'b', setId: 's2', blueprint: { kind: 'mcq', v: 2 }, passedCount: 17, wordCount: 20 },
   { id: 'old', setId: 's1', blueprint: { kind: 'fill', v: 1 }, passedCount: 20, wordCount: 20 },
  ]);
  mocks.sets.mockResolvedValue([{ id: 's1', title: 'Travel' }, { id: 's2', title: 'Food' }]);
  const result = await getDailyTasks('u1', new Date('2026-10-26T20:00:00+07:00'));
  expect(result).toEqual({ mcq: { passedCount: 17, wordCount: 20, setId: 's2', setTitle: 'Food' } });
  expect(mocks.attempts.mock.calls[0]?.[0].where.finishedAt).toEqual({ gte: new Date('2026-10-25T17:00:00.000Z'), lt: new Date('2026-10-26T17:00:00.000Z') });
 });
});
