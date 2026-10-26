export interface BundleExample {
	id: string;
	english: string;
	meaningVi: string;
	target: string;
	targetStart: number | null;
	targetLength: number | null;
	targetTag: string;
	cefr: string | null;
	audioPath: string;
	sortOrder: number;
}

export interface BundleHint {
	id: string;
	order: number;
	kind: string;
	textEn: string;
	textVi: string;
	cefr: string | null;
}

export interface SenseChunk {
	text: string;
	vi: string;
}

export interface SenseCommonError {
	wrong: string;
	right: string;
	whyVi: string;
}

export interface SenseContrastSide {
	lemma: string;
	en: string;
	vi: string;
}

export interface SenseMistake {
	wrong: string;
	right: string;
}

export interface BundleRelation {
	id: string;
	kind: string;
	lemma: string;
	targetSenseId: string | null;
	confusableType: string | null;
	noteVi: string;
	contrast: SenseContrastSide[];
	mistake: SenseMistake | null;
	sortOrder: number;
}

export interface BundleFamilyMember {
	lemma: string;
	wordId: string | null;
	partOfSpeech: string;
	affixNote: string;
	meaningVi: string;
	sortOrder: number;
}

export interface BundleFamily {
	id: string;
	key: string;
	kind: string;
	root: string;
	meaningVi: string;
	meaningEn: string;
	originNote: string;
	members: BundleFamilyMember[];
}

export interface SenseBundle {
	sense: {
		id: string;
		senseKey: string | null;
		meaningVi: string;
		definitionEn: string;
		definitionEnSimple: string;
		cefr: string | null;
		register: string;
		region: string;
		topics: string[];
		grammarTags: string[];
		grammarNoteVi: string;
		pitfallVi: string;
		chunks: SenseChunk[];
		commonErrors: SenseCommonError[];
		distractorLemmas: string[];
		distractorMeanings: string[];
		ipaOverride: string;
		partOfSpeech: string;
	};
	word: {
		id: string;
		lemma: string;
		lemmaKey: string;
		ipa: string;
		ipaUk: string;
		ipaUs: string;
		syllables: string[];
		stressIndex: number | null;
		stress: string;
		forms: string[];
		inflections: Array<{ form: string; tag: string }>;
		cefr: string | null;
		frequencyRank: number | null;
		entryType: string;
		audioPath: string;
		audioUkPath: string;
		audioUsPath: string;
	};
	examples: BundleExample[];
	hints: BundleHint[];
	relations: BundleRelation[];
	families: BundleFamily[];
}

export interface SenseBundleSource {
	id: string;
	senseKey: string | null;
	meaningVi: string;
	definitionEn: string;
	definitionEnSimple: string;
	cefr: string | null;
	register: string;
	region: string;
	topics: string[];
	grammarTags: string[];
	grammarNoteVi: string;
	pitfallVi: string;
	chunks: unknown;
	commonErrors: unknown;
	distractorLemmas: string[];
	distractorMeanings: string[];
	ipaOverride: string;
	partOfSpeech: string;
	word: {
		id: string;
		lemma: string;
		lemmaKey: string;
		ipa: string;
		ipaUk: string;
		ipaUs: string;
		syllables: string[];
		stressIndex: number | null;
		stress: string;
		forms: string[];
		inflections: unknown;
		cefr: string | null;
		frequencyRank: number | null;
		entryType: string;
		audioPath: string;
		audioUkPath: string;
		audioUsPath: string;
		familyLinks: Array<{ family: BundleFamily & { members: BundleFamilyMember[] } }>;
	};
	examples: Array<BundleExample & { status: string }>;
	hints: Array<BundleHint & { status: string }>;
	relations: Array<Omit<BundleRelation, 'contrast' | 'mistake'> & { contrast: unknown; mistake: unknown }>;
}

function asRecordRows<T>(value: unknown, map: (row: Record<string, unknown>) => T | null): T[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const mapped = map(item as Record<string, unknown>);
		return mapped ? [mapped] : [];
	});
}

export function asChunks(value: unknown): SenseChunk[] {
	return asRecordRows(value, (row) => (
		typeof row.text === 'string' && row.text.trim()
			? { text: row.text, vi: typeof row.vi === 'string' ? row.vi : '' }
			: null
	));
}

export function asCommonErrors(value: unknown): SenseCommonError[] {
	return asRecordRows(value, (row) => (
		typeof row.wrong === 'string' && typeof row.right === 'string'
			? { wrong: row.wrong, right: row.right, whyVi: typeof row.whyVi === 'string' ? row.whyVi : '' }
			: null
	));
}

export function asContrast(value: unknown): SenseContrastSide[] {
	return asRecordRows(value, (row) => (
		typeof row.lemma === 'string'
			? {
				lemma: row.lemma,
				en: typeof row.en === 'string' ? row.en : '',
				vi: typeof row.vi === 'string' ? row.vi : '',
			}
			: null
	));
}

export function asMistake(value: unknown): SenseMistake | null {
	if (!value || typeof value !== 'object') return null;
	const row = value as { wrong?: unknown; right?: unknown };
	if (typeof row.wrong !== 'string' || typeof row.right !== 'string') return null;
	return { wrong: row.wrong, right: row.right };
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

function maskIpa(ipa: string): string {
	const trimmed = ipa.trim();
	if (!trimmed) return '';
	const wrapped = trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2;
	const inner = wrapped ? trimmed.slice(1, -1) : trimmed;
	if (inner.length <= 2) return trimmed;
	const shown = inner.slice(0, 2);
	return wrapped ? `/${shown}…/` : `${shown}…`;
}

/** Published examples and hints only. Draft rows stay out of future exercises. */
export function toSenseBundle(row: SenseBundleSource): SenseBundle {
	const families = row.word.familyLinks.map((link) => ({
		id: link.family.id,
		key: link.family.key,
		kind: link.family.kind,
		root: link.family.root,
		meaningVi: link.family.meaningVi,
		meaningEn: link.family.meaningEn,
		originNote: link.family.originNote,
		members: [...link.family.members].sort((a, b) => a.sortOrder - b.sortOrder).map((member) => ({
			lemma: member.lemma,
			wordId: member.wordId,
			partOfSpeech: member.partOfSpeech,
			affixNote: member.affixNote,
			meaningVi: member.meaningVi,
			sortOrder: member.sortOrder,
		})),
	}));
	return {
		sense: {
			id: row.id,
			senseKey: row.senseKey,
			meaningVi: row.meaningVi,
			definitionEn: row.definitionEn,
			definitionEnSimple: row.definitionEnSimple,
			cefr: row.cefr,
			register: row.register,
			region: row.region,
			topics: row.topics,
			grammarTags: row.grammarTags,
			grammarNoteVi: row.grammarNoteVi,
			pitfallVi: row.pitfallVi,
			chunks: asChunks(row.chunks),
			commonErrors: asCommonErrors(row.commonErrors),
			distractorLemmas: row.distractorLemmas,
			distractorMeanings: row.distractorMeanings,
			ipaOverride: row.ipaOverride,
			partOfSpeech: row.partOfSpeech,
		},
		word: {
			id: row.word.id,
			lemma: row.word.lemma,
			lemmaKey: row.word.lemmaKey,
			ipa: row.word.ipa,
			ipaUk: row.word.ipaUk,
			ipaUs: row.word.ipaUs,
			syllables: row.word.syllables,
			stressIndex: row.word.stressIndex,
			stress: row.word.stress,
			forms: row.word.forms,
			inflections: asInflections(row.word.inflections),
			cefr: row.word.cefr,
			frequencyRank: row.word.frequencyRank,
			entryType: row.word.entryType,
			audioPath: row.word.audioPath,
			audioUkPath: row.word.audioUkPath,
			audioUsPath: row.word.audioUsPath,
		},
		examples: row.examples
			.filter((example) => example.status === 'published')
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((example) => ({
				id: example.id,
				english: example.english,
				meaningVi: example.meaningVi,
				target: example.target,
				targetStart: example.targetStart,
				targetLength: example.targetLength,
				targetTag: example.targetTag,
				cefr: example.cefr,
				audioPath: example.audioPath,
				sortOrder: example.sortOrder,
			})),
		hints: row.hints
			.filter((hint) => hint.status === 'published')
			.sort((a, b) => a.order - b.order)
			.map((hint) => ({
				id: hint.id,
				order: hint.order,
				kind: hint.kind,
				textEn: hint.textEn,
				textVi: hint.textVi,
				cefr: hint.cefr,
			})),
		relations: [...row.relations].sort((a, b) => a.sortOrder - b.sortOrder).map((relation) => ({
			id: relation.id,
			kind: relation.kind,
			lemma: relation.lemma,
			targetSenseId: relation.targetSenseId,
			confusableType: relation.confusableType,
			noteVi: relation.noteVi,
			contrast: asContrast(relation.contrast),
			mistake: asMistake(relation.mistake),
			sortOrder: relation.sortOrder,
		})),
		families,
	};
}

export interface RuntimeHint {
	kind: 'first_letter' | 'letter_count' | 'syllable_count' | 'ipa_masked';
	textEn: string;
	textVi: string;
}

/** Letter, syllable, and masked-IPA clues. These are computed, not stored. */
export function runtimeHints(bundle: SenseBundle): RuntimeHint[] {
	const letters = bundle.word.lemma.trim().replace(/[\s-]/g, '');
	const first = letters[0] ?? '';
	const hints: RuntimeHint[] = [];
	if (first) {
		hints.push({
			kind: 'first_letter',
			textEn: `It starts with the letter ${first.toUpperCase()}.`,
			textVi: `Bắt đầu bằng chữ ${first.toUpperCase()}.`,
		});
	}
	if (letters.length > 0) {
		hints.push({
			kind: 'letter_count',
			textEn: `It has ${letters.length} letters.`,
			textVi: `Có ${letters.length} chữ cái.`,
		});
	}
	if (bundle.word.syllables.length > 0) {
		hints.push({
			kind: 'syllable_count',
			textEn: `It has ${bundle.word.syllables.length} syllables.`,
			textVi: `Có ${bundle.word.syllables.length} âm tiết.`,
		});
	}
	const ipa = bundle.sense.ipaOverride.trim() || bundle.word.ipaUk.trim() || bundle.word.ipaUs.trim() || bundle.word.ipa.trim();
	const masked = maskIpa(ipa);
	if (masked) {
		hints.push({
			kind: 'ipa_masked',
			textEn: `It sounds like ${masked}.`,
			textVi: `Phát âm gần như ${masked}.`,
		});
	}
	return hints;
}

export interface ClozeParts {
	before: string;
	answer: string;
	after: string;
	tag: string;
}

export function clozeOf(example: {
	english: string;
	target: string;
	targetStart: number | null;
	targetLength: number | null;
	targetTag: string;
}): ClozeParts | null {
	if (example.targetStart == null || example.targetLength == null) return null;
	const start = example.targetStart;
	const end = start + example.targetLength;
	if (start < 0 || end > example.english.length) return null;
	const answer = example.english.slice(start, end);
	if (answer.toLowerCase() !== example.target.trim().toLowerCase()) return null;
	return {
		before: example.english.slice(0, start),
		answer,
		after: example.english.slice(end),
		tag: example.targetTag,
	};
}

const BLANK = /_{3,}/;

/** Split an example around its target, whether it marks the target by offsets or with a `___` blank. */
export function exampleParts(example: Parameters<typeof clozeOf>[0]): ClozeParts | null {
	const cloze = clozeOf(example);
	if (cloze) return cloze;
	const match = BLANK.exec(example.english);
	if (!match || !example.target.trim()) return null;
	return {
		before: example.english.slice(0, match.index),
		answer: example.target.trim(),
		after: example.english.slice(match.index + match[0].length),
		tag: example.targetTag,
	};
}
