#!/usr/bin/env npx tsx
/**
 * Import one English pack JSON as a published set in the configured database.
 *
 * Packs carry placeholder audio names for validation. After publish they are cleared
 * so Practice uses browser TTS; words that already existed keep their audio.
 * Run: npm run db:import:pack -- <file.json> [--check]
 *   --check  only validate and list every issue, no database writes.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

async function main() {
	const args = process.argv.slice(2);
	const file = args.find((arg) => !arg.startsWith('--'));
	if (!file) throw new Error('Cần đường dẫn tới file JSON của bộ từ.');
	const checkOnly = args.includes('--check');

	const { assessEnglishPack } = await import('@/lib/english/contentValidation');
	const input: unknown = JSON.parse(await readFile(resolve(process.cwd(), file), 'utf8'));
	const assessment = assessEnglishPack(input);
	if (assessment.schemaError || !assessment.pack) {
		throw new Error(`${file}: ${assessment.schemaError ?? 'Gói dữ liệu không hợp lệ'}`);
	}
	const pack = assessment.pack;
	for (const item of assessment.issues) {
		console.log(`  ${item.blocksGrade ? '✖' : '·'} ${item.path} [${item.code}]: ${item.message}`);
	}
	const blocked = assessment.words.filter((word) => !word.publishable || word.gradeExampleCount < 2);
	if (blocked.length > 0) {
		throw new Error(`Chưa thể xuất bản: ${blocked.map((word) => pack.words[word.index]?.lemma).join(', ')}`);
	}
	console.log(`  ✓ ${pack.title}: ${pack.words.length} từ hợp lệ`);
	if (checkOnly) return;

	const { prisma } = await import('@/lib/prisma');
	const { lemmaKeyOf } = await import('@/lib/english/text');
	const { publishEnglishSet, saveEnglishPack } = await import('@/services/english/enContentService');
	try {
		const existingSet = await prisma.enSet.findFirst({ where: { title: pack.title } });
		if (existingSet) {
			throw new Error(`Bộ "${pack.title}" đã có trong database (${existingSet.status}); không tự ghi đè.`);
		}
		const existingWords = await prisma.enWord.findMany({
			where: { lemmaKey: { in: pack.words.map((word) => lemmaKeyOf(word.lemma)) } },
			select: { id: true, lemma: true, audioPath: true, audioUkPath: true, audioUsPath: true },
		});
		if (existingWords.length > 0) {
			console.log(`  · Dùng lại ${existingWords.length} từ đã có: ${existingWords.map((word) => word.lemma).join(', ')}`);
		}

		const { setId } = await saveEnglishPack(input);
		const published = await publishEnglishSet(setId, async () => true);
		if (published.publishedSenses !== pack.words.length) {
			const details = published.issues
				.filter((item) => item.blocksGrade)
				.map((item) => `${item.path} [${item.code}]: ${item.message}`)
				.join('\n');
			throw new Error(`Bộ "${pack.title}" chỉ xuất bản được ${published.publishedSenses}/${pack.words.length} từ.\n${details}`);
		}

		const items = await prisma.enSetItem.findMany({ where: { setId }, select: { senseId: true } });
		const senseIds = items.flatMap((item) => item.senseId ? [item.senseId] : []);
		const senses = await prisma.enSense.findMany({ where: { id: { in: senseIds } }, select: { wordId: true } });
		const keptIds = new Set(existingWords.map((word) => word.id));
		await prisma.$transaction([
			prisma.enWord.updateMany({
				where: { id: { in: senses.map((sense) => sense.wordId).filter((id) => !keptIds.has(id)) } },
				data: { audioPath: '', audioUkPath: '', audioUsPath: '' },
			}),
			...existingWords.map(({ id, audioPath, audioUkPath, audioUsPath }) => prisma.enWord.update({
				where: { id },
				data: { audioPath, audioUkPath, audioUsPath },
			})),
			prisma.enExample.updateMany({ where: { senseId: { in: senseIds } }, data: { audioPath: '' } }),
		]);
		console.log(`  ✅ ${pack.title}: đã xuất bản ${published.publishedSenses} từ (set ${setId})`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
