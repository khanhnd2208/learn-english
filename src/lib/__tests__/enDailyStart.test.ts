import { expect, it, vi } from 'vitest';
import { bundle } from './fixtures/bundle';
const mock = vi.hoisted(() => ({ raw: vi.fn(), create: vi.fn(), bundles: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: mock.raw, enPracticeSession: { create: mock.create } } }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: mock.bundles }));
import { startToday } from '@/services/english/enDailyService';

it('shows hints for new and low boxes, none for box 3, and sends only the card example', async () => {
	const now = new Date('2026-10-28T12:00:00Z'), old = new Date('2026-10-26T00:00:00Z');
	mock.raw.mockResolvedValueOnce([2,3].map((box) => ({ id: `st${box}`, senseId: `s${box}`, box, dueAt: old, lapses: 0, introducedAt: old, lastReviewedAt: old }))).mockResolvedValueOnce([{ senseId: 's1' }]);
	mock.create.mockResolvedValue({ id: 'session' }); mock.bundles.mockResolvedValue([1,2,3].map(bundle));
	const result = await startToday('user', now);
	expect(result.items.map((item) => [item.box, Boolean(item.hint)])).toEqual([[2,true],[3,false],[0,true]]);
	expect(result.items.every((item) => !('prompt' in item) && !('cloze' in item))).toBe(true);
	expect(result.items.every((item) => item.bundle.examples.length === 1 && item.bundle.examples[0]?.role === 'study')).toBe(true);
	expect(mock.create.mock.calls[0]![0].data.activityKey).toBe('srs_type');
});

it('persists at most 50 words with at least 60 percent due when available', async () => {
	const now = new Date('2026-10-28T12:00:00Z');
	mock.raw.mockResolvedValueOnce(Array.from({ length: 40 }, (_, i) => ({ id: `st${i}`, senseId: `due${i}`, box: 1, dueAt: now, lapses: 0, introducedAt: now, lastReviewedAt: null }))).mockResolvedValueOnce(Array.from({ length: 3000 }, (_, i) => ({ senseId: `new${i}` })));
	mock.create.mockResolvedValue({ id: 'session' }); mock.bundles.mockResolvedValue([]);
	await startToday('user', now);
	const ids = mock.create.mock.calls.at(-1)![0].data.senseIds as string[];
	expect(ids).toHaveLength(50);
	expect(ids.filter((id) => id.startsWith('due')).length).toBeGreaterThanOrEqual(30);
	expect(mock.bundles).toHaveBeenLastCalledWith(ids, true);
});
