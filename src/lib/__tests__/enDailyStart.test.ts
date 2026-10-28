import { expect, it, vi } from 'vitest';
import { bundle } from './fixtures/bundle';
const mock = vi.hoisted(() => ({ states: vi.fn(), enrollments: vi.fn(), items: vi.fn(), create: vi.fn(), bundles: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enWordState: { findMany: mock.states }, enEnrollment: { findMany: mock.enrollments }, enSetItem: { findMany: mock.items }, enPracticeSession: { create: mock.create } } }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: mock.bundles }));
import { startToday } from '@/services/english/enDailyService';
it('shows hints for new and low boxes, and none for box 3', async () => {
 const now = new Date('2026-10-28T12:00:00Z'); const old = new Date('2026-10-26T00:00:00Z');
 mock.states.mockResolvedValue([2,3].map((box) => ({ id: `st${box}`, senseId: `s${box}`, box, dueAt: old, lapses: 0, introducedAt: old, lastReviewedAt: old })));
 mock.enrollments.mockResolvedValue([{ setId: 'set' }]); mock.items.mockResolvedValue([{ senseId: 's1' },{ senseId: 's2' },{ senseId: 's3' }]);
 mock.create.mockResolvedValue({ id: 'session' }); mock.bundles.mockResolvedValue([1,2,3].map(bundle));
 const result = await startToday('user', now);
 expect(result.items.map((item) => [item.box, Boolean(item.hint)])).toEqual([[2,true],[3,false],[0,true]]);
 expect(result.items.every((item) => !('prompt' in item) && !('cloze' in item))).toBe(true);
 expect(mock.create.mock.calls[0]![0].data.activityKey).toBe('srs_type');
});
