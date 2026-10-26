#!/usr/bin/env npx tsx
/**
 * Seed two published English sample sets into the local database.
 *
 * The JSON packs contain placeholder audio names for validation. After publish,
 * the seed clears them so Practice uses browser TTS and Test omits audio items.
 * Run: npm run db:seed:english-samples
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

const SAMPLE_FILES = [
	'docs/testing/english-sample-packs/travel.json',
	'docs/testing/english-sample-packs/food.json',
] as const;

async function main() {
	const { assessEnglishPack } = await import('@/lib/english/contentValidation');
	const { prisma } = await import('@/lib/prisma');
	const { publishEnglishSet, saveEnglishPack } = await import('@/services/english/enContentService');

	try {
		for (const relativePath of SAMPLE_FILES) {
			const input: unknown = JSON.parse(await readFile(resolve(process.cwd(), relativePath), 'utf8'));
			const assessment = assessEnglishPack(input);
			if (assessment.schemaError || !assessment.pack) {
				throw new Error(`${relativePath}: ${assessment.schemaError ?? 'Gói dữ liệu không hợp lệ'}`);
			}
			if (assessment.pack.words.length !== 10) {
				throw new Error(`${relativePath}: cần đúng 10 từ, hiện có ${assessment.pack.words.length}`);
			}
			const blockedWords = assessment.words.filter((word) => !word.publishable);
			if (blockedWords.length > 0) {
				const lemmas = blockedWords.map((word) => assessment.pack?.words[word.index]?.lemma).filter(Boolean);
				throw new Error(`${relativePath}: chưa thể xuất bản các từ ${lemmas.join(', ')}`);
			}

			const existing = await prisma.enSet.findFirst({
				where: { title: assessment.pack.title },
				include: { items: { select: { senseId: true } } },
			});
			let setId: string;
			if (existing) {
				const wordCount = existing.items.filter((item) => item.senseId).length;
				if (wordCount !== 10) {
					throw new Error(`Bộ "${existing.title}" đã tồn tại nhưng có ${wordCount}/10 từ; không tự ghi đè dữ liệu local.`);
				}
				setId = existing.id;
			} else {
				const saved = await saveEnglishPack(assessment.pack);
				setId = saved.setId;
			}
			for (const word of assessment.pack.words) {
				if (!word.senseKey) continue;
				await prisma.enSense.updateMany({
					where: { senseKey: word.senseKey },
					data: {
						distractorMeanings: word.distractorMeanings,
						distractorLemmas: word.distractorLemmas,
					},
				});
			}

			const published = existing?.status === 'published'
				? { publishedSenses: 10, publishedPatterns: 0, issues: [] }
				: await publishEnglishSet(setId, async () => true);
			if (published.publishedSenses !== 10) {
				const details = published.issues
					.filter((issue) => issue.blocksGrade)
					.map((issue) => `${issue.path} [${issue.code}]: ${issue.message}`)
					.join('\n');
				throw new Error(`Bộ "${assessment.pack.title}" chỉ xuất bản được ${published.publishedSenses}/10 từ.\n${details}`);
			}
			const seededItems = await prisma.enSetItem.findMany({ where: { setId }, select: { senseId: true } });
			const seededSenseIds = seededItems.flatMap((item) => item.senseId ? [item.senseId] : []);
			const seededWords = await prisma.enSense.findMany({ where: { id: { in: seededSenseIds } }, select: { wordId: true } });
			await prisma.$transaction([
				prisma.enWord.updateMany({ where: { id: { in: seededWords.map((word) => word.wordId) } }, data: { audioPath: '', audioUkPath: '', audioUsPath: '' } }),
				prisma.enExample.updateMany({ where: { senseId: { in: seededSenseIds } }, data: { audioPath: '' } }),
			]);
			console.log(`  ✅ ${assessment.pack.title}: 10 từ`);
		}
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
