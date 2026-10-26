import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { lowestCefr } from '@/lib/english/cefr';
import { asChunks, asCommonErrors, asContrast, asMistake } from '@/lib/english/senseBundle';
import {
	assessEnglishPack,
	type AssessedPack,
	type PackExample,
	type PackRelation,
	type PackWord,
} from '@/lib/english/contentValidation';
import { lemmaKeyOf } from '@/lib/english/text';
import { toSenseBundle, type SenseBundle } from '@/lib/english/senseBundle';
import { audioFileExists } from '@/services/english/enAudioService';

export interface EnglishPackSaveResult {
	setId: string;
	issues: AssessedPack['issues'];
	schemaError: string | null;
}

export interface EnglishPublishResult {
	publishedSenses: number;
	issues: AssessedPack['issues'];
}

function json(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

function asInflections(value: unknown): Array<{ form: string; tag: string }> {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const row = item as { form?: unknown; tag?: unknown };
		if (typeof row.form !== 'string') return [];
		return [{ form: row.form, tag: typeof row.tag === 'string' ? row.tag : '' }];
	});
}

async function existingAudio(names: string[], exists: (file: string) => Promise<boolean>): Promise<string[]> {
	const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
	const checks = await Promise.all(unique.map(async (name) => ({ name, ok: await exists(name) })));
	return checks.filter((item) => item.ok).map((item) => item.name);
}

function rawRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function rawWord(input: unknown, index: number): Record<string, unknown> {
	const words = rawRecord(input).words;
	return Array.isArray(words) ? rawRecord(words[index]) : {};
}

function rawAt(raw: Record<string, unknown>, key: string, index: number): Record<string, unknown> {
	const list = raw[key];
	return Array.isArray(list) ? rawRecord(list[index]) : {};
}

function putText(data: Record<string, unknown>, key: string, value: string) {
	const text = value.trim();
	if (text) data[key] = text;
}

function reverseKind(kind: PackRelation['kind']): PackRelation['kind'] {
	if (kind === 'broader') return 'narrower';
	if (kind === 'narrower') return 'broader';
	return kind;
}

function wordCreate(word: PackWord): Prisma.EnWordUncheckedCreateInput {
	return {
		lemma: word.lemma.trim(),
		lemmaKey: lemmaKeyOf(word.lemma),
		ipa: word.ipa.trim(),
		ipaUk: word.ipaUk.trim(),
		ipaUs: word.ipaUs.trim(),
		stress: word.stress.trim(),
		stressIndex: word.stressIndex,
		syllables: word.syllables.map((part) => part.trim()).filter(Boolean),
		partOfSpeech: word.partOfSpeech.trim(),
		forms: word.forms,
		entryType: word.entryType,
		inflections: json(word.inflections),
		frequencyRank: word.frequencyRank,
		audioPath: word.audioFile.trim(),
		status: 'draft',
	};
}

function wordPatch(word: PackWord, raw: Record<string, unknown>): Prisma.EnWordUncheckedUpdateInput {
	const data: Prisma.EnWordUncheckedUpdateInput = {};
	putText(data, 'lemma', word.lemma);
	putText(data, 'ipa', word.ipa);
	putText(data, 'ipaUk', word.ipaUk);
	putText(data, 'ipaUs', word.ipaUs);
	putText(data, 'stress', word.stress);
	putText(data, 'partOfSpeech', word.partOfSpeech);
	putText(data, 'audioPath', word.audioFile);
	if (word.forms.length > 0) data.forms = word.forms;
	if (word.syllables.length > 0) data.syllables = word.syllables.map((part) => part.trim()).filter(Boolean);
	if (word.inflections.length > 0) data.inflections = json(word.inflections);
	if (word.stressIndex != null) data.stressIndex = word.stressIndex;
	if (word.frequencyRank != null) data.frequencyRank = word.frequencyRank;
	if ('entryType' in raw) data.entryType = word.entryType;
	return data;
}

function senseCreate(word: PackWord, wordId: string, sortOrder: number): Prisma.EnSenseUncheckedCreateInput {
	return {
		wordId,
		meaningVi: word.meaningVi.trim(),
		partOfSpeech: word.partOfSpeech.trim(),
		pitfallVi: word.pitfallVi.trim(),
		chunks: json(word.chunks),
		commonErrors: json(word.commonErrors),
		distractorMeanings: word.distractorMeanings,
		distractorLemmas: word.distractorLemmas,
		senseKey: word.senseKey.trim() || null,
		definitionEn: word.definitionEn.trim(),
		definitionEnSimple: word.definitionEnSimple.trim(),
		cefr: word.cefr,
		register: word.register,
		region: word.region,
		topics: word.topics,
		grammarTags: word.grammarTags,
		grammarNoteVi: word.grammarNoteVi.trim(),
		ipaOverride: word.ipaOverride.trim(),
		imagePath: word.imageFile.trim(),
		sortOrder,
		status: 'draft',
	};
}

function sensePatch(word: PackWord, wordId: string, sortOrder: number, raw: Record<string, unknown>): Prisma.EnSenseUncheckedUpdateInput {
	const data: Prisma.EnSenseUncheckedUpdateInput = { wordId, sortOrder };
	putText(data, 'meaningVi', word.meaningVi);
	putText(data, 'partOfSpeech', word.partOfSpeech);
	putText(data, 'pitfallVi', word.pitfallVi);
	putText(data, 'definitionEn', word.definitionEn);
	putText(data, 'definitionEnSimple', word.definitionEnSimple);
	putText(data, 'grammarNoteVi', word.grammarNoteVi);
	putText(data, 'ipaOverride', word.ipaOverride);
	putText(data, 'imagePath', word.imageFile);
	if (word.senseKey.trim()) data.senseKey = word.senseKey.trim();
	if (word.chunks.length > 0) data.chunks = json(word.chunks);
	if (word.commonErrors.length > 0) data.commonErrors = json(word.commonErrors);
	if (word.distractorMeanings.length > 0) data.distractorMeanings = word.distractorMeanings;
	if (word.distractorLemmas.length > 0) data.distractorLemmas = word.distractorLemmas;
	if (word.topics.length > 0) data.topics = word.topics;
	if (word.grammarTags.length > 0) data.grammarTags = word.grammarTags;
	if (word.cefr) data.cefr = word.cefr;
	if ('register' in raw) data.register = word.register;
	if ('region' in raw) data.region = word.region;
	return data;
}

function exampleWrite(example: PackExample, exampleIndex: number, grade: boolean, raw: Record<string, unknown>): Omit<Prisma.EnExampleUncheckedCreateInput, 'senseId'> {
	const data: Omit<Prisma.EnExampleUncheckedCreateInput, 'senseId'> = {
		english: example.english.trim(),
		meaningVi: example.meaningVi.trim(),
		target: example.target.trim(),
		targetTag: example.targetTag.trim(),
		audioPath: example.audioFile.trim(),
		role: grade ? 'grade' : 'study',
		alternatives: example.alternativesTried.map((item) => item.trim()).filter(Boolean),
		ambiguityNote: example.stillPlausible.map((item) => item.trim()).filter(Boolean).join(', '),
		sortOrder: exampleIndex,
	};
	if (example.targetStart != null) {
		data.targetStart = example.targetStart;
		data.targetLength = example.target.length;
	}
	if (example.cefr) data.cefr = example.cefr;
	if ('origin' in raw) data.origin = example.origin;
	if (example.sourceNote.trim()) data.sourceNote = example.sourceNote.trim();
	return data;
}

async function resolveTargetSenseId(
	tx: Prisma.TransactionClient,
	lemma: string,
	partOfSpeech: string,
): Promise<string | null> {
	const senses = await tx.enSense.findMany({
		where: { word: { lemmaKey: lemmaKeyOf(lemma) } },
		select: { id: true, partOfSpeech: true },
	});
	if (senses.length === 1) return senses[0]?.id ?? null;
	const pos = partOfSpeech.trim().toLowerCase();
	const matched = senses.filter((sense) => sense.partOfSpeech.trim().toLowerCase() === pos);
	return matched.length === 1 ? matched[0]?.id ?? null : null;
}

export async function saveEnglishPack(input: unknown): Promise<EnglishPackSaveResult> {
	const assessment = assessEnglishPack(input);
	if (assessment.schemaError || !assessment.pack) {
		throw new AppError(assessment.schemaError ?? 'Gói nội dung không đúng cấu trúc', 400);
	}
	const pack = assessment.pack;
	const setId = await prisma.$transaction(async (tx) => {
		const set = await tx.enSet.create({
			data: { title: pack.title.trim(), description: pack.description.trim(), status: 'draft' },
		});
		const senseIdByLemma = new Map<string, string>();
		const wordIdByKey = new Map<string, string>();
		const savedSenses: Array<{ id: string; lemma: string; partOfSpeech: string }> = [];
		for (const [index, word] of pack.words.entries()) {
			if (!word.lemma.trim()) continue;
			const raw = rawWord(input, index);
			const assessed = assessment.words[index];
			const lemmaKey = lemmaKeyOf(word.lemma);
			let wordId = wordIdByKey.get(lemmaKey);
			if (!wordId) {
				const existingWord = await tx.enWord.findUnique({ where: { lemmaKey } });
				if (!existingWord) {
					const createdWord = await tx.enWord.create({ data: wordCreate(word) });
					wordId = createdWord.id;
				} else {
					wordId = existingWord.id;
					await tx.enWord.update({ where: { id: wordId }, data: wordPatch(word, raw) });
				}
				wordIdByKey.set(lemmaKey, wordId);
			} else {
				await tx.enWord.update({ where: { id: wordId }, data: wordPatch(word, raw) });
			}
			const senseKey = word.senseKey.trim();
			const existingSense = senseKey
				? await tx.enSense.findUnique({ where: { senseKey } })
				: null;
			const sense = existingSense
				? await tx.enSense.update({
					where: { id: existingSense.id },
					data: sensePatch(word, wordId, index, raw),
				})
				: await tx.enSense.create({ data: senseCreate(word, wordId, index) });
			savedSenses[index] = { id: sense.id, lemma: word.lemma.trim(), partOfSpeech: word.partOfSpeech };
			senseIdByLemma.set(lemmaKey, sense.id);
			await tx.enSetItem.create({
				data: { setId: set.id, senseId: sense.id, position: index },
			});
			const existingExamples = await tx.enExample.findMany({ where: { senseId: sense.id } });
			const usedExampleIds = new Set<string>();
			for (const [exampleIndex, example] of word.examples.entries()) {
				const grade = assessed?.examples.find((item) => item.index === exampleIndex)?.gradeEligible === true;
				const data = exampleWrite(example, exampleIndex, grade, rawAt(raw, 'examples', exampleIndex));
				const match = existingExamples.find((row) => !usedExampleIds.has(row.id) && row.english.trim() === example.english.trim());
				if (match) {
					usedExampleIds.add(match.id);
					await tx.enExample.update({ where: { id: match.id }, data });
					continue;
				}
				await tx.enExample.create({ data: { senseId: sense.id, ...data, status: 'draft' } });
			}
		}
		const pendingReverse: Array<{
			senseId: string;
			sourceLemma: string;
			kind: PackRelation['kind'];
			targetSenseId: string;
			confusableType: PackRelation['confusableType'];
			noteVi: string;
		}> = [];
		for (const [index, word] of pack.words.entries()) {
			const saved = savedSenses[index];
			if (!saved) continue;
			await tx.enSenseHint.deleteMany({ where: { senseId: saved.id } });
			for (const [hintIndex, hint] of word.hints.entries()) {
				if (!hint.textEn.trim()) continue;
				await tx.enSenseHint.create({
					data: {
						senseId: saved.id,
						order: hint.order ?? hintIndex + 1,
						kind: hint.kind,
						textEn: hint.textEn.trim(),
						textVi: hint.textVi.trim(),
						cefr: hint.cefr,
						status: 'draft',
					},
				});
			}
			await tx.enSenseRelation.deleteMany({ where: { senseId: saved.id } });
			for (const [relationIndex, relation] of word.relations.entries()) {
				const lemma = relation.lemma.trim();
				if (!lemma) continue;
				const targetSenseId = await resolveTargetSenseId(tx, lemma, word.partOfSpeech);
				await tx.enSenseRelation.create({
					data: {
						senseId: saved.id,
						kind: relation.kind,
						lemma,
						targetSenseId,
						confusableType: relation.confusableType,
						noteVi: relation.noteVi.trim(),
						contrast: json(relation.contrast),
						mistake: relation.mistake ? json(relation.mistake) : undefined,
						sortOrder: relationIndex,
					},
				});
				if (!targetSenseId || targetSenseId === saved.id) continue;
				pendingReverse.push({
					senseId: saved.id,
					sourceLemma: saved.lemma,
					kind: reverseKind(relation.kind),
					targetSenseId,
					confusableType: relation.confusableType,
					noteVi: relation.noteVi.trim(),
				});
			}
		}
		for (const relation of pendingReverse) {
			const where = {
				senseId_kind_lemma: {
					senseId: relation.targetSenseId,
					kind: relation.kind,
					lemma: relation.sourceLemma,
				},
			};
			const existing = await tx.enSenseRelation.findUnique({ where });
			if (existing) {
				if (!existing.targetSenseId) {
					await tx.enSenseRelation.update({
						where: { id: existing.id },
						data: { targetSenseId: relation.senseId },
					});
				}
				continue;
			}
			await tx.enSenseRelation.create({
				data: {
					senseId: relation.targetSenseId,
					kind: relation.kind,
					lemma: relation.sourceLemma,
					targetSenseId: relation.senseId,
					confusableType: relation.confusableType,
					noteVi: relation.noteVi,
					sortOrder: 0,
				},
			});
		}
		for (const [familyIndex, family] of pack.families.entries()) {
			const key = family.key.trim();
			if (!key || !family.root.trim()) continue;
			const rawFamily = rawAt(rawRecord(input), 'families', familyIndex);
			const savedFamily = await tx.enWordFamily.upsert({
				where: { key },
				create: {
					key,
					kind: family.kind,
					root: family.root.trim(),
					meaningVi: family.meaningVi.trim(),
					meaningEn: family.meaningEn.trim(),
					originNote: family.originNote.trim(),
					status: 'draft',
				},
				update: {
					...(family.root.trim() ? { root: family.root.trim() } : {}),
					...(family.meaningVi.trim() ? { meaningVi: family.meaningVi.trim() } : {}),
					...(family.meaningEn.trim() ? { meaningEn: family.meaningEn.trim() } : {}),
					...(family.originNote.trim() ? { originNote: family.originNote.trim() } : {}),
					...('kind' in rawFamily ? { kind: family.kind } : {}),
				},
			});
			for (const [memberIndex, member] of family.members.entries()) {
				const lemma = member.lemma.trim();
				if (!lemma) continue;
				const linked = await tx.enWord.findUnique({
					where: { lemmaKey: lemmaKeyOf(lemma) },
					select: { id: true },
				});
				await tx.enWordFamilyMember.upsert({
					where: { familyId_lemma: { familyId: savedFamily.id, lemma } },
					create: {
						familyId: savedFamily.id,
						lemma,
						wordId: linked?.id ?? null,
						partOfSpeech: member.partOfSpeech.trim(),
						affixNote: member.affixNote.trim(),
						meaningVi: member.meaningVi.trim(),
						sortOrder: memberIndex,
					},
					update: {
						...(member.partOfSpeech.trim() ? { partOfSpeech: member.partOfSpeech.trim() } : {}),
						...(member.affixNote.trim() ? { affixNote: member.affixNote.trim() } : {}),
						...(member.meaningVi.trim() ? { meaningVi: member.meaningVi.trim() } : {}),
						...(linked ? { wordId: linked.id } : {}),
						sortOrder: memberIndex,
					},
				});
			}
		}
		return set.id;
	});
	return { setId, issues: assessment.issues, schemaError: null };
}

export async function publishEnglishSet(
	setId: string,
	exists: (file: string) => Promise<boolean> = audioFileExists,
): Promise<EnglishPublishResult> {
	const set = await prisma.enSet.findUnique({
		where: { id: setId },
		include: {
			items: {
				include: {
					sense: {
						include: {
							word: { include: { familyLinks: { include: { family: { include: { members: true } } } } } },
							examples: true,
							hints: { orderBy: { order: 'asc' } },
							relations: { orderBy: { sortOrder: 'asc' } },
						},
					},
				},
			},
		},
	});
	if (!set) throw new AppError('Không tìm thấy bộ học', 404);
	const issues: AssessedPack['issues'] = [];
	let publishedSenses = 0;

	for (const item of set.items) {
		if (item.sense) {
			const sense = item.sense;
			const names = [sense.word.audioPath, ...sense.examples.map((example) => example.audioPath)];
			const audioFiles = await existingAudio(names, exists);
			const assessmentInput = {
				title: set.title,
				description: set.description,
				audioFiles,
				families: sense.word.familyLinks.map((link) => ({
					key: link.family.key,
					kind: link.family.kind,
					root: link.family.root,
					meaningVi: link.family.meaningVi,
					meaningEn: link.family.meaningEn,
					originNote: link.family.originNote,
					members: link.family.members.map((member) => ({
						lemma: member.lemma,
						partOfSpeech: member.partOfSpeech,
						affixNote: member.affixNote,
						meaningVi: member.meaningVi,
					})),
				})),
				words: [{
					lemma: sense.word.lemma,
					senseKey: sense.senseKey ?? '',
					entryType: sense.word.entryType,
					ipa: sense.word.ipa,
					ipaUk: sense.word.ipaUk,
					ipaUs: sense.word.ipaUs,
					syllables: sense.word.syllables,
					stressIndex: sense.word.stressIndex,
					stress: sense.word.stress,
					inflections: asInflections(sense.word.inflections),
					frequencyRank: sense.word.frequencyRank,
					partOfSpeech: sense.word.partOfSpeech,
					forms: sense.word.forms,
					meaningVi: sense.meaningVi,
					definitionEn: sense.definitionEn,
					definitionEnSimple: sense.definitionEnSimple,
					cefr: sense.cefr,
					register: sense.register,
					region: sense.region,
					topics: sense.topics,
					grammarTags: sense.grammarTags,
					grammarNoteVi: sense.grammarNoteVi,
					ipaOverride: sense.ipaOverride,
					collocations: asChunks(sense.chunks).map((chunk) => chunk.text),
					chunks: asChunks(sense.chunks),
					commonErrors: asCommonErrors(sense.commonErrors),
					pitfallVi: sense.pitfallVi,
					audioFile: sense.word.audioPath,
					imageFile: sense.imagePath,
					distractorMeanings: sense.distractorMeanings,
					distractorLemmas: sense.distractorLemmas,
					hints: sense.hints.map((hint) => ({
						order: hint.order,
						kind: hint.kind,
						textEn: hint.textEn,
						textVi: hint.textVi,
						cefr: hint.cefr,
					})),
					relations: sense.relations.map((relation) => ({
						kind: relation.kind,
						lemma: relation.lemma,
						confusableType: relation.confusableType,
						noteVi: relation.noteVi,
						contrast: asContrast(relation.contrast),
						mistake: asMistake(relation.mistake),
					})),
					examples: sense.examples.map((example) => ({
						english: example.english,
						meaningVi: example.meaningVi,
						target: example.target,
						targetStart: example.targetStart,
						targetLength: example.targetLength,
						targetTag: example.targetTag,
						cefr: example.cefr,
						origin: example.origin,
						sourceNote: example.sourceNote,
						audioFile: example.audioPath,
						alternativesTried: example.alternatives,
						stillPlausible: example.ambiguityNote ? example.ambiguityNote.split(',').map((part) => part.trim()).filter(Boolean) : [],
						adminCleared: example.role === 'grade' && example.ambiguityNote.length > 0,
					})),
				}],
			};
			const assessment = assessEnglishPack(assessmentInput);
			if (assessment.schemaError) {
				issues.push({ path: sense.word.lemma, code: 'schema', message: assessment.schemaError, blocksGrade: true });
				continue;
			}
			issues.push(...assessment.issues.map((issue) => ({ ...issue, path: `${sense.word.lemma}: ${issue.path}` })));
			const assessed = assessment.words[0];
			if (!assessed?.publishable) continue;
			await prisma.enSense.update({ where: { id: sense.id }, data: { status: 'published' } });
			for (const [exampleIndex, example] of sense.examples.entries()) {
				const grade = assessed.examples.find((item) => item.index === exampleIndex)?.gradeEligible === true;
				await prisma.enExample.update({
					where: { id: example.id },
					data: { role: grade ? 'grade' : 'study', status: 'published' },
				});
			}
			await prisma.enSenseHint.updateMany({
				where: { senseId: sense.id, status: { not: 'suspended' } },
				data: { status: 'published' },
			});
			const familyIds = sense.word.familyLinks.map((link) => link.familyId);
			if (familyIds.length > 0) {
				await prisma.enWordFamily.updateMany({
					where: { id: { in: familyIds }, status: { not: 'suspended' } },
					data: { status: 'published' },
				});
			}
			const publishedLevels = await prisma.enSense.findMany({
				where: { wordId: sense.wordId, status: 'published' },
				select: { cefr: true },
			});
			await prisma.enWord.update({
				where: { id: sense.wordId },
				data: { status: 'published', cefr: lowestCefr(publishedLevels.map((row) => row.cefr)) },
			});
			publishedSenses += 1;
		}
	}

	if (publishedSenses > 0) {
		await prisma.enSet.update({ where: { id: set.id }, data: { status: 'published' } });
	}
	return { publishedSenses, issues };
}

const senseBundleInclude = {
	word: {
		include: {
			familyLinks: {
				include: {
					family: { include: { members: true } },
				},
			},
		},
	},
	examples: true,
	hints: true,
	relations: true,
} satisfies Prisma.EnSenseInclude;

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
