#!/usr/bin/env npx tsx
/**
 * Copy loose English links into the structured tables.
 *
 * - distractorLemmas become confusable relations (type left unset)
 * - relations and family members gain ids when the other word now exists
 * - examples gain a cloze offset when the target appears once
 *
 * Sentences that are missing or ambiguous are listed in
 * en-example-offset-report.json and are not guessed.
 *
 *   npx tsx scripts/en-backfill-relations.ts --dry-run
 *   npx tsx scripts/en-backfill-relations.ts --apply
 *
 * Dry-run is the default. Learner progress stays on senseId.
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

import {
	planDistractorRelations,
	planExampleOffsets,
	planSoftLinks,
} from '@/lib/english/relationBackfill';

const reportPath = resolve(process.cwd(), 'en-example-offset-report.json');

async function main() {
	const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
	const { prisma } = await import('@/lib/prisma');

	const senses = await prisma.enSense.findMany({
		include: {
			word: { select: { lemmaKey: true } },
			relations: { select: { id: true, kind: true, lemma: true, targetSenseId: true } },
			examples: { select: { id: true, english: true, target: true, targetStart: true } },
		},
	});
	const members = await prisma.enWordFamilyMember.findMany({
		select: { id: true, lemma: true, wordId: true },
	});
	const words = await prisma.enWord.findMany({ select: { id: true, lemmaKey: true } });

	const distractors = planDistractorRelations(senses.map((sense) => ({
		id: sense.id,
		distractorLemmas: sense.distractorLemmas,
		existingLemmas: sense.relations.filter((relation) => relation.kind === 'confusable').map((relation) => relation.lemma),
	})));
	const links = planSoftLinks({
		relations: senses.flatMap((sense) => sense.relations.map((relation) => ({
			id: relation.id,
			lemma: relation.lemma,
			targetSenseId: relation.targetSenseId,
			sourcePartOfSpeech: sense.partOfSpeech,
		}))),
		senses: senses.map((sense) => ({
			id: sense.id,
			lemmaKey: sense.word.lemmaKey,
			partOfSpeech: sense.partOfSpeech,
		})),
		members,
		words,
	});
	const offsets = planExampleOffsets(senses.flatMap((sense) => sense.examples));
	writeFileSync(reportPath, `${JSON.stringify(offsets.report, null, 2)}\n`);

	const summary = {
		dryRun: !apply,
		distractorRelations: distractors.length,
		relationLinks: links.relationUpdates.length,
		memberLinks: links.memberUpdates.length,
		exampleOffsets: offsets.updates.length,
		exampleReport: offsets.report.length,
		reportPath,
	};
	console.log(JSON.stringify(summary, null, 2));

	if (!apply) {
		await prisma.$disconnect();
		return;
	}

	for (const relation of distractors) {
		await prisma.enSenseRelation.create({
			data: {
				senseId: relation.senseId,
				kind: 'confusable',
				lemma: relation.lemma,
				confusableType: null,
				noteVi: '',
			},
		});
	}
	for (const relation of links.relationUpdates) {
		await prisma.enSenseRelation.update({
			where: { id: relation.id },
			data: { targetSenseId: relation.targetSenseId },
		});
	}
	for (const member of links.memberUpdates) {
		await prisma.enWordFamilyMember.update({
			where: { id: member.id },
			data: { wordId: member.wordId },
		});
	}
	for (const example of offsets.updates) {
		await prisma.enExample.update({
			where: { id: example.id },
			data: { targetStart: example.targetStart, targetLength: example.targetLength },
		});
	}

	await prisma.$disconnect();
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
