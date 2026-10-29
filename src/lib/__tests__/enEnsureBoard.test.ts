import { expect, it, vi } from 'vitest';
import type { Quest } from '@/lib/english/quests';
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn(), createMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enQuestBoard: mocks } }));
import { ensureBoard } from '@/services/english/enGoalService';

it('does not evaluate build for a complete board with positive targets', async () => {
	const quests: Quest[] = [{ key: 'srs_words', target: 20, xp: 100 }, { key: 'chunk_done', target: 2, xp: 100 }];
	mocks.findUnique.mockResolvedValue({ quests });
	const build = vi.fn(async () => quests);
	expect(await ensureBoard('u', 'daily', '2026-10-29', build)).toEqual(quests);
	expect(build).not.toHaveBeenCalled();
});

it('tops up an idle or missing quest while preserving existing positive targets', async () => {
	const quests: Quest[] = [{ key: 'srs_words', target: 0, xp: 0 }];
	mocks.findUnique.mockResolvedValue({ quests });
	const build = vi.fn(async (): Promise<Quest[]> => [{ key: 'srs_words', target: 10, xp: 100 }, { key: 'chunk_done', target: 2, xp: 100 }]);
	expect(await ensureBoard('u', 'daily', '2026-10-29', build)).toEqual(await build());
	expect(mocks.update).toHaveBeenCalled();
});
