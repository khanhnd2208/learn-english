import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_PACK_TX_TIMEOUT_MS, EN_TX_MAX_WAIT_MS } from '@/lib/english/constants';
import { assessEnglishPack, type AssessedPack } from '@/lib/english/contentValidation';
import { lemmaKeyOf } from '@/lib/english/text';
import { parseAdvancedNotes } from '@/lib/english/advancedNotes';
import { toSenseBundle, type SenseBundle } from '@/lib/english/senseBundle';
import { audioFileExists } from '@/services/english/enAudioService';

export interface EnglishPackSaveResult { setId: string; issues: AssessedPack['issues']; schemaError: string | null }
export interface EnglishPublishResult { publishedSenses: number; issues: AssessedPack['issues'] }

export async function saveEnglishPack(input: unknown): Promise<EnglishPackSaveResult> {
 const assessment = assessEnglishPack(input);
 if (assessment.schemaError || !assessment.pack) throw new AppError(assessment.schemaError ?? 'Gói nội dung không đúng cấu trúc', 400);
 const pack = assessment.pack;
 const setId = await prisma.$transaction(async (tx) => {
  const set = await tx.enSet.create({ data: { title: pack.title, description: pack.description, status: 'draft' } });
  for (const [index, word] of pack.words.entries()) {
   if (!word.lemma) continue;
   const lemmaKey = lemmaKeyOf(word.lemma);
   const wordData = { lemma: word.lemma, partOfSpeech: word.partOfSpeech, ipa: word.ipa, audioPath: word.audioFile, forms: word.forms };
   const wordUpdate = { lemma: word.lemma, ...(word.partOfSpeech ? { partOfSpeech: word.partOfSpeech } : {}), ...(word.ipa ? { ipa: word.ipa } : {}), ...(word.audioFile ? { audioPath: word.audioFile } : {}), ...(word.forms.length ? { forms: word.forms } : {}) };
   const storedWord = await tx.enWord.upsert({ where: { lemmaKey }, create: { lemmaKey, ...wordData, status: 'draft' }, update: wordUpdate });
   const senseData = { wordId: storedWord.id, meaningVi: word.meaningVi, partOfSpeech: word.partOfSpeech, synonyms: word.synonyms, noteVi: word.noteVi, advanced: word.advanced, sortOrder: index };
   const senseUpdate = { wordId: storedWord.id, sortOrder: index, ...(word.meaningVi ? { meaningVi: word.meaningVi } : {}), ...(word.partOfSpeech ? { partOfSpeech: word.partOfSpeech } : {}), synonyms: word.synonyms, noteVi: word.noteVi, advanced: word.advanced };
   const sense = word.senseKey ? await tx.enSense.upsert({ where: { senseKey: word.senseKey }, create: { ...senseData, senseKey: word.senseKey, status: 'draft' }, update: senseUpdate }) : await tx.enSense.create({ data: { ...senseData, status: 'draft' } });
   await tx.enSetItem.create({ data: { setId: set.id, senseId: sense.id, position: index } });
   const existing = await tx.enExample.findMany({ where: { senseId: sense.id } });
   const used = new Set<string>();
   for (const [i, example] of word.examples.entries()) {
    const data = { english: example.english, meaningVi: example.meaningVi, target: example.target, targetStart: example.targetStart, targetLength: example.targetLength, role: assessment.words[index]?.examples[i]?.gradeEligible ? 'grade' as const : 'study' as const, sortOrder: i };
    const match = existing.find((e) => !used.has(e.id) && e.english.trim() === example.english);
    if (match) { used.add(match.id); await tx.enExample.update({ where: { id: match.id }, data }); }
    else await tx.enExample.create({ data: { ...data, senseId: sense.id, status: 'draft' } });
   }
  }
  return set.id;
 }, { timeout: EN_PACK_TX_TIMEOUT_MS, maxWait: EN_TX_MAX_WAIT_MS });
 return { setId, issues: assessment.issues, schemaError: null };
}

export async function publishEnglishSet(setId: string, exists: (file: string) => Promise<boolean> = audioFileExists): Promise<EnglishPublishResult> {
 const set = await prisma.enSet.findUnique({ where: { id: setId }, include: { items: { include: { sense: { include: { word: true, examples: { orderBy: { sortOrder: 'asc' } } } } } } } });
 if (!set) throw new AppError('Không tìm thấy bộ học', 404);
 const issues: AssessedPack['issues'] = []; let publishedSenses = 0;
 for (const item of set.items) {
  const sense = item.sense; if (!sense) continue;
  const audio = sense.word.audioPath;
  const assessment = assessEnglishPack({ title: set.title, description: set.description, packVersion: 3, audioFiles: audio && await exists(audio) ? [audio] : [], words: [{ lemma: sense.word.lemma, senseKey: sense.senseKey ?? '', partOfSpeech: sense.partOfSpeech, ipa: sense.word.ipa, audioFile: audio, forms: sense.word.forms, meaningVi: sense.meaningVi, synonyms: sense.synonyms, noteVi: sense.noteVi, advanced: parseAdvancedNotes(sense.advanced), examples: sense.examples.map((e) => ({ english: e.english, meaningVi: e.meaningVi, target: e.target, targetStart: e.targetStart, targetLength: e.targetLength, gradable: e.role === 'grade' })) }] });
  issues.push(...assessment.issues.map((i) => ({ ...i, path: `${sense.word.lemma}: ${i.path}` })));
  if (!assessment.words[0]?.publishable) continue;
  await prisma.enSense.update({ where: { id: sense.id }, data: { status: 'published' } });
  for (const [i, example] of sense.examples.entries()) await prisma.enExample.update({ where: { id: example.id }, data: { role: assessment.words[0].examples[i]?.gradeEligible ? 'grade' : 'study', status: 'published' } });
  await prisma.enWord.update({ where: { id: sense.wordId }, data: { status: 'published' } });
  publishedSenses++;
 }
 if (publishedSenses) await prisma.enSet.update({ where: { id: set.id }, data: { status: 'published' } });
 return { publishedSenses, issues };
}

export async function updateEnglishSetStore(
	setId: string,
	input: { listed?: boolean; accessCode?: string },
) {
	const set = await prisma.enSet.findUnique({ where: { id: setId }, select: { id: true } });
	if (!set) throw new AppError('Không tìm thấy bộ học', 404);
	return prisma.enSet.update({
		where: { id: setId },
		data: {
			...(input.listed !== undefined ? { listed: input.listed } : {}),
			...(input.accessCode !== undefined ? { accessCode: input.accessCode.trim() || null } : {}),
		},
		select: { id: true, listed: true, accessCode: true },
	});
}

export async function deleteEnglishSet(setId: string) {
	return prisma.$transaction(async (tx) => {
		const set = await tx.enSet.findUnique({ where: { id: setId }, select: { id: true } });
		if (!set) throw new AppError('Không tìm thấy bộ học', 404);
		const [preferences, sessions] = await Promise.all([
			tx.enReviewPreference.findMany({ where: { selectedSetIds: { has: setId } }, select: { userId: true, selectedSetIds: true } }),
			tx.enGuidedReviewSession.findMany({ where: { selectedSetIds: { has: setId } }, select: { id: true, selectedSetIds: true } }),
		]);
		await Promise.all([
			...preferences.map((preference) => tx.enReviewPreference.update({
				where: { userId: preference.userId },
				data: { selectedSetIds: { set: preference.selectedSetIds.filter((id) => id !== setId) } },
			})),
			...sessions.map((session) => tx.enGuidedReviewSession.update({
				where: { id: session.id },
				data: { selectedSetIds: { set: session.selectedSetIds.filter((id) => id !== setId) } },
			})),
		]);
		await tx.enSet.delete({ where: { id: setId } });
		return { deleted: true };
	});
}

const senseBundleInclude = { word: true, examples: true } satisfies Prisma.EnSenseInclude;

export async function getSenseBundles(senseIds: string[], publishedOnly = false): Promise<SenseBundle[]> {
	if (senseIds.length === 0) return [];
	const rows = await prisma.enSense.findMany({
		where: { id: { in: senseIds }, ...(publishedOnly ? { status: 'published' as const } : {}) },
		include: senseBundleInclude,
	});
	const order = new Map(senseIds.map((id, index) => [id, index]));
	return rows
		.map((row) => toSenseBundle(row))
		.sort((a, b) => (order.get(a.sense.id) ?? 0) - (order.get(b.sense.id) ?? 0));
}

export async function listEnglishAdminSets() {
	const sets = await prisma.enSet.findMany({
		orderBy: { updatedAt: 'desc' },
		take: 20,
		include: { _count: { select: { items: true, enrollments: true } } },
	});
	return sets.map((set) => ({
		id: set.id,
		title: set.title,
		status: set.status,
		items: set._count.items,
		learners: set._count.enrollments,
	}));
}
