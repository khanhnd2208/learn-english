#!/usr/bin/env npx tsx
/**
 * Give every EnWord one lemmaKey and fold duplicate lemmas onto the oldest row.
 *
 * Senses move to the kept word. SRS, answer logs, and set items stay on senseId.
 *
 *   npx tsx scripts/en-backfill-lemma-key.ts --dry-run
 *   npx tsx scripts/en-backfill-lemma-key.ts --apply
 *
 * Dry-run is the default. Run this before the migration that makes lemmaKey unique.
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

import { planLemmaKeyBackfill, type LemmaWordRow } from '@/lib/english/lemmaMerge';

async function main() {
	const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
	const { prisma } = await import('@/lib/prisma');

	const rows = await prisma.enWord.findMany({
		include: { senses: { select: { id: true } } },
	});
	const words: LemmaWordRow[] = rows.map((word) => ({
		id: word.id,
		lemma: word.lemma,
		createdAt: word.createdAt,
		ipa: word.ipa,
		audioPath: word.audioPath,
		forms: word.forms,
		senseIds: word.senses.map((sense) => sense.id),
	}));
	const plan = planLemmaKeyBackfill(words);
	const summary = {
		dryRun: !apply,
		words: words.length,
		groups: plan.duplicateGroups,
		sensesMoved: plan.sensesMoved,
		wordsDeleted: plan.keeps.reduce((sum, keep) => sum + keep.deleteIds.length, 0),
	};
	console.log(JSON.stringify(summary, null, 2));

	if (!apply) {
		await prisma.$disconnect();
		return;
	}

	for (const keep of plan.keeps) {
		await prisma.$transaction(async (tx) => {
			if (keep.senseMoves.length > 0) {
				await tx.enSense.updateMany({
					where: { id: { in: keep.senseMoves.map((move) => move.senseId) } },
					data: { wordId: keep.id },
				});
			}
			await tx.enWord.update({
				where: { id: keep.id },
				data: {
					lemmaKey: keep.lemmaKey,
					forms: keep.forms,
					ipa: keep.ipa,
					audioPath: keep.audioPath,
				},
			});
			if (keep.deleteIds.length > 0) {
				await tx.enWord.deleteMany({ where: { id: { in: keep.deleteIds } } });
			}
		});
	}

	await prisma.$disconnect();
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
