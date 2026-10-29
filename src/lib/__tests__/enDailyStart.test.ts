import { expect, it, vi } from 'vitest';
import { bundle } from './fixtures/bundle';
const mock = vi.hoisted(() => ({ states: vi.fn(), enrollments: vi.fn(), items: vi.fn(), create: vi.fn(), bundles: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enWordState: { findMany: mock.states }, enEnrollment: { findMany: mock.enrollments }, enSetItem: { findMany: mock.items }, enPracticeSession: { create: mock.create } } }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: mock.bundles }));
import { startToday } from '@/services/english/enDailyService';
it('shows hints for new and low boxes, and none for box 3', async () => {
 const now = new Date('2026-10-28T12:00:00Z'); const old = new Date('2026-10-26T00:00:00Z');
 mock.states.mockResolvedValue([2,3].map((box) => ({ id: `st${box}`, senseId: `s${box}`, box, dueAt: old, lapses: 0, introducedAt: old, lastReviewedAt: old })));
 mock.enrollments.mockResolvedValue([{ setId: 'set' }]); mock.items.mockResolvedValue(['s1','s2','s3'].map((senseId) => ({ setId: 'set', senseId })));
 mock.create.mockResolvedValue({ id: 'session' }); mock.bundles.mockResolvedValue([1,2,3].map(bundle));
 const result = await startToday('user', now);
 expect(result.items.map((item) => [item.box, Boolean(item.hint)])).toEqual([[2,true],[3,false],[0,true]]);
 expect(result.items.every((item) => !('prompt' in item) && !('cloze' in item))).toBe(true);
 expect(mock.create.mock.calls[0]![0].data.activityKey).toBe('srs_type');
});
it('brings every unscheduled word of every downloaded set into the round', async () => {
 const now = new Date('2026-10-28T12:00:00Z');
 mock.states.mockResolvedValue([{ id: 'st1', senseId: 'a1', box: 2, dueAt: new Date('2026-11-05T00:00:00Z'), lapses: 0, introducedAt: new Date('2026-10-20T00:00:00Z'), lastReviewedAt: null }]);
 mock.enrollments.mockResolvedValue([{ setId: 'setA' }, { setId: 'setB' }, { setId: 'setC' }]);
 mock.items.mockResolvedValue([
  ...Array.from({ length: 20 }, (_, index) => ({ setId: 'setA', senseId: `a${index + 1}` })),
  { setId: 'setB', senseId: 'b1' }, { setId: 'setB', senseId: 'b2' },
  { setId: 'setC', senseId: 'c1' },
 ]);
 mock.create.mockResolvedValue({ id: 'session' }); mock.bundles.mockResolvedValue([]);
 await startToday('user', now);
 const senseIds = mock.create.mock.calls.at(-1)![0].data.senseIds as string[];
 expect(senseIds.slice(0, 5)).toEqual(['a2', 'b1', 'c1', 'a3', 'b2']);
 expect(senseIds).toHaveLength(22);
});
