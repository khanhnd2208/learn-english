import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ raw: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: mocks.raw } }));
import { overviewCounts } from '@/services/english/enOverviewQueries';

it('binds the learner and Vietnam boundaries in the aggregate query', async () => {
	mocks.raw.mockResolvedValue([{ liveCount: 1, learnedCount: 1, dueTotal: 1, enrolledSets: 1, due0: 1, due1: 0, due2: 0, due3: 0, due4: 0, due5: 0, due6: 0 }]);
	const now = new Date('2026-10-26T10:00:00+07:00');
	const counts = await overviewCounts('learner', now);
	expect(counts).toMatchObject({ dueTotal: 1, learnedCount: 1, newCount: 0, enrolledSets: 1 });
	const sql = mocks.raw.mock.calls[0]![0];
	expect(sql.values).toContain('learner');
	expect(sql.values).toContainEqual(new Date('2026-10-26T17:00:00Z'));
	expect(sql.sql).toContain('DISTINCT');
});
