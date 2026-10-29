import { expect, test } from 'vitest';
import { seedSmallWorld } from './fixtures';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { listEnglishSets as legacyListEnglishSets } from './legacy/catalog';
import { getProgressHistory } from '@/services/english/enProgressService';
import { getProgressHistory as legacyProgressHistory } from './legacy/progress';

for (const seed of [1,2,3,4,5]) test(`catalog and history preserve item counting and stage semantics, seed ${seed}`, async () => {
	const { userIds } = await seedSmallWorld(seed);
	for (const user of userIds) {
		for (const drafts of [false, true]) expect(await listEnglishSets(user, drafts)).toEqual(await legacyListEnglishSets(user, drafts));
		const now = new Date('2026-10-30T12:00:00Z');
		expect(await getProgressHistory(user, now)).toEqual(await legacyProgressHistory(user, now));
	}
});
