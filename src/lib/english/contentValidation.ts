import { z } from 'zod';
import {
	EN_ALTERNATIVES_REQUIRED,
	EN_CEFR_LEVELS,
	EN_GRAMMAR_TAGS,
	EN_HINTS_REQUIRED,
	EN_INFLECTION_TAGS,
	EN_MAX_COLLOCATIONS,
	EN_MAX_EXAMPLES_PER_WORD,
	EN_MAX_PATTERNS_PER_PACK,
	EN_MAX_WORDS_PER_PACK,
	EN_PATTERN_MIN_EXAMPLES,
	EN_TOPICS,
	EN_USAGE_MIN_GRADE_EXAMPLES,
} from '@/lib/english/constants';
import {
	blankReport,
	containsWholeWord,
	fixedPartsInOrder,
	isFullVietnameseMeaning,
	lemmaKeyOf,
	locateTarget,
	normalizeLearnerText,
	uniqueTexts,
} from '@/lib/english/text';

const cefrSchema = z.enum(EN_CEFR_LEVELS);
const topicSet = new Set<string>(EN_TOPICS);
const grammarTagSet = new Set<string>(EN_GRAMMAR_TAGS);
const inflectionTagSet = new Set<string>(EN_INFLECTION_TAGS);
const SENSE_KEY_RE = /^[a-z0-9' -]+\.[a-z]+\.[a-z0-9_]+$/;
const IPA_RE = /^\/[^/\n]+\/$/;

const exampleSchema = z.object({
	english: z.string().default(''),
	meaningVi: z.string().default(''),
	target: z.string().default(''),
	targetStart: z.number().int().nonnegative().nullable().default(null),
	targetLength: z.number().int().nonnegative().nullable().default(null),
	targetTag: z.string().default(''),
	cefr: cefrSchema.nullable().default(null),
	origin: z.enum(['authored', 'ai_generated', 'corpus']).default('authored'),
	sourceNote: z.string().default(''),
	audioFile: z.string().default(''),
	alternativesTried: z.array(z.string()).default([]),
	stillPlausible: z.array(z.string()).default([]),
	adminCleared: z.boolean().optional(),
});

const hintSchema = z.object({
	order: z.number().int().positive().nullable().default(null),
	kind: z.enum(['category', 'function', 'context', 'association', 'contrast', 'morphology']),
	textEn: z.string().default(''),
	textVi: z.string().default(''),
	cefr: cefrSchema.nullable().default(null),
});

const chunkSchema = z.object({
	text: z.string().min(1),
	vi: z.string().default(''),
});

const commonErrorSchema = z.object({
	wrong: z.string().default(''),
	right: z.string().default(''),
	whyVi: z.string().default(''),
});

const contrastSideSchema = z.object({
	lemma: z.string().default(''),
	en: z.string().default(''),
	vi: z.string().default(''),
});

const mistakeSchema = z.object({
	wrong: z.string().default(''),
	right: z.string().default(''),
});

const relationSchema = z.object({
	kind: z.enum(['synonym', 'antonym', 'broader', 'narrower', 'confusable']),
	lemma: z.string().default(''),
	confusableType: z.enum(['spelling', 'sound', 'meaning', 'false_friend', 'grammar', 'collocation']).nullable().default(null),
	noteVi: z.string().default(''),
	contrast: z.array(contrastSideSchema).max(2).default([]),
	mistake: mistakeSchema.nullable().default(null),
});

const wordSchema = z.object({
	lemma: z.string().default(''),
	senseKey: z.string().default(''),
	entryType: z.enum(['word', 'phrasal_verb', 'idiom', 'fixed_phrase']).default('word'),
	ipa: z.string().default(''),
	ipaUk: z.string().default(''),
	ipaUs: z.string().default(''),
	syllables: z.array(z.string()).default([]),
	stressIndex: z.number().int().nonnegative().nullable().default(null),
	stress: z.string().default(''),
	inflections: z.array(z.object({
		form: z.string().default(''),
		tag: z.string().default(''),
	})).default([]),
	frequencyRank: z.number().int().positive().nullable().default(null),
	cefr: cefrSchema.nullable().default(null),
	partOfSpeech: z.string().default(''),
	forms: z.array(z.string()).default([]),
	meaningVi: z.string().default(''),
	definitionEn: z.string().default(''),
	definitionEnSimple: z.string().default(''),
	register: z.enum(['neutral', 'formal', 'informal', 'slang', 'literary', 'technical', 'old_fashioned', 'offensive']).default('neutral'),
	region: z.enum(['both', 'uk', 'us']).default('both'),
	topics: z.array(z.string()).default([]),
	grammarTags: z.array(z.string()).default([]),
	grammarNoteVi: z.string().default(''),
	ipaOverride: z.string().default(''),
	collocations: z.array(z.string()).max(EN_MAX_COLLOCATIONS).default([]),
	chunks: z.array(chunkSchema).max(EN_MAX_COLLOCATIONS).default([]),
	commonErrors: z.array(commonErrorSchema).max(5).default([]),
	pitfallVi: z.string().default(''),
	audioFile: z.string().default(''),
	imageFile: z.string().default(''),
	distractorMeanings: z.array(z.string()).default([]),
	distractorLemmas: z.array(z.string()).default([]),
	hints: z.array(hintSchema).default([]),
	relations: z.array(relationSchema).default([]),
	examples: z.array(exampleSchema).max(EN_MAX_EXAMPLES_PER_WORD).default([]),
});

const familyMemberSchema = z.object({
	lemma: z.string().default(''),
	partOfSpeech: z.string().default(''),
	affixNote: z.string().default(''),
	meaningVi: z.string().default(''),
});

const familySchema = z.object({
	key: z.string().default(''),
	kind: z.enum(['derivation', 'root']),
	root: z.string().default(''),
	meaningVi: z.string().default(''),
	meaningEn: z.string().default(''),
	originNote: z.string().default(''),
	members: z.array(familyMemberSchema).default([]),
});

const patternExampleSchema = z.object({
	english: z.string().default(''),
	meaningVi: z.string().default(''),
	audioFile: z.string().default(''),
	slotValues: z.array(z.object({
		id: z.string(),
		value: z.string(),
	})).default([]),
});

const patternSchema = z.object({
	purposeVi: z.string().default(''),
	frame: z.string().default(''),
	fixedParts: z.array(z.string()).default([]),
	slots: z.array(z.object({
		id: z.string(),
		labelVi: z.string().default(''),
		choices: z.array(z.string()).default([]),
	})).default([]),
	pitfallVi: z.string().default(''),
	senseLemmas: z.array(z.string()).default([]),
	examples: z.array(patternExampleSchema).max(4).default([]),
});

export const englishPackSchema = z.object({
	title: z.string().default(''),
	description: z.string().default(''),
	packVersion: z.number().int().default(1),
	audioFiles: z.array(z.string()).default([]),
	families: z.array(familySchema).default([]),
	words: z.array(wordSchema).max(EN_MAX_WORDS_PER_PACK).default([]),
	patterns: z.array(patternSchema).max(EN_MAX_PATTERNS_PER_PACK).default([]),
});

export type EnglishPack = z.infer<typeof englishPackSchema>;
export type PackWord = EnglishPack['words'][number];
export type PackExample = PackWord['examples'][number];
export type PackHint = PackWord['hints'][number];
export type PackRelation = PackWord['relations'][number];
export type PackFamily = EnglishPack['families'][number];
export type PackPattern = EnglishPack['patterns'][number];

export interface ContentIssue {
	path: string;
	code: string;
	message: string;
	blocksGrade: boolean;
}

export interface AssessedExample {
	index: number;
	gradeEligible: boolean;
	issues: ContentIssue[];
}

export interface AssessedWord {
	index: number;
	publishable: boolean;
	gradeExampleCount: number;
	examples: AssessedExample[];
	issues: ContentIssue[];
}

export interface AssessedPattern {
	index: number;
	publishable: boolean;
	issues: ContentIssue[];
}

export interface AssessedPack {
	schemaError: string | null;
	pack: EnglishPack | null;
	issues: ContentIssue[];
	words: AssessedWord[];
	patterns: AssessedPattern[];
}

function issue(path: string, code: string, message: string, blocksGrade: boolean): ContentIssue {
	return { path, code, message, blocksGrade };
}

function audioListed(file: string, files: string[]): boolean {
	return file.trim().length > 0 && files.includes(file.trim());
}

function wordMarksNewPack(word: PackWord): boolean {
	if (word.senseKey.trim() || word.definitionEn.trim() || word.definitionEnSimple.trim()) return true;
	if (word.cefr || word.hints.length > 0 || word.relations.length > 0) return true;
	if (word.syllables.length > 0 || word.inflections.length > 0) return true;
	if (word.ipaUk.trim() || word.ipaUs.trim() || word.ipaOverride.trim() || word.grammarNoteVi.trim() || word.imageFile.trim()) return true;
	if (word.topics.length > 0 || word.grammarTags.length > 0) return true;
	if (word.frequencyRank != null || word.stressIndex != null) return true;
	if (word.entryType !== 'word' || word.register !== 'neutral' || word.region !== 'both') return true;
	return word.examples.some((example) => (
		example.targetStart != null
		|| example.targetTag.trim().length > 0
		|| example.cefr != null
		|| example.origin !== 'authored'
		|| example.sourceNote.trim().length > 0
	));
}

function packIsNew(pack: EnglishPack): boolean {
	return pack.packVersion >= 2 || pack.families.length > 0 || pack.words.some(wordMarksNewPack);
}

function familyLemmasFor(pack: EnglishPack, lemma: string): string[] {
	const key = lemmaKeyOf(lemma);
	const lemmas: string[] = [];
	for (const family of pack.families) {
		const members = family.members.map((member) => member.lemma.trim()).filter(Boolean);
		if (!members.some((member) => lemmaKeyOf(member) === key)) continue;
		lemmas.push(...members);
	}
	return uniqueTexts(lemmas);
}

function placeExample(example: PackExample): PackExample {
	const target = example.target.trim();
	let targetStart = example.targetStart;
	if (targetStart == null && target && !example.english.includes('___')) {
		const located = locateTarget(example.english, target);
		if (typeof located !== 'string') targetStart = located.start;
	}
	return {
		...example,
		target,
		targetStart,
		targetLength: targetStart == null ? null : target.length,
	};
}

export function normalizeEnglishPack(pack: EnglishPack): EnglishPack {
	return {
		...pack,
		audioFiles: uniqueTexts(pack.audioFiles),
		words: pack.words.map((word, index) => {
			const others = pack.words.filter((_, other) => other !== index);
			const wordKey = lemmaKeyOf(word.lemma);
			const meanings = word.distractorMeanings.length
				? word.distractorMeanings
				: others.map((other) => other.meaningVi);
			const explicitDistractors = word.distractorLemmas.length > 0;
			const familyKeys = new Set(familyLemmasFor(pack, word.lemma).map((lemma) => lemmaKeyOf(lemma)));
			const confusableKeys = new Set(
				[
					...word.relations
					.filter((relation) => relation.kind === 'confusable')
					.map((relation) => lemmaKeyOf(relation.lemma)),
					...others
						.filter((other) => other.relations.some((relation) => (
							relation.kind === 'confusable' && lemmaKeyOf(relation.lemma) === wordKey
						)))
						.map((other) => lemmaKeyOf(other.lemma)),
				],
			);
			const blockedDistractor = (lemma: string) => {
				const key = lemmaKeyOf(lemma);
				return familyKeys.has(key) || confusableKeys.has(key);
			};
			const lemmas = explicitDistractors
				? word.distractorLemmas
				: others.map((other) => other.lemma).filter((lemma) => !blockedDistractor(lemma));
			const sentForms = word.forms.map((form) => form.trim()).filter(Boolean);
			const inflectionForms = word.inflections.map((item) => item.form.trim()).filter(Boolean);
			const ipa = word.ipa.trim() || word.ipaUk.trim() || word.ipaUs.trim();
			return {
				...word,
				ipa,
				forms: sentForms.length > 0 ? sentForms : uniqueTexts(inflectionForms),
				distractorMeanings: uniqueTexts(meanings).filter((meaning) => meaning.toLowerCase() !== word.meaningVi.trim().toLowerCase()),
				distractorLemmas: uniqueTexts(lemmas).filter((lemma) => lemma.toLowerCase() !== word.lemma.trim().toLowerCase()),
				chunks: word.chunks.length > 0
					? word.chunks.map((chunk) => ({ text: chunk.text.trim(), vi: chunk.vi.trim() })).filter((chunk) => chunk.text.length > 0)
					: word.collocations.map((text) => text.trim()).filter(Boolean).map((text) => ({ text, vi: '' })),
				hints: word.hints.map((hint, hintIndex) => ({
					...hint,
					order: hint.order ?? hintIndex + 1,
				})),
				relations: word.relations.filter((relation) => relation.lemma.trim().length > 0),
				examples: word.examples.map(placeExample),
			};
		}),
	};
}

function assessExample(
	word: PackWord,
	example: PackExample,
	exampleIndex: number,
	audioFiles: string[],
	familyLemmas: string[],
): AssessedExample {
	const path = `words.${word.lemma || '?'}.examples.${exampleIndex}`;
	const issues: ContentIssue[] = [];
	const blank = blankReport(example.english, example.target);
	if (!blank.ok) {
		issues.push(issue(path, blank.code ?? 'one_blank', 'Câu điền phải có đúng một chỗ trống và đúng dạng từ mục tiêu.', true));
	}
	const gradeForms = new Set([
		word.lemma,
		...word.forms,
		...word.inflections.map((item) => item.form),
	].map((form) => form.trim().toLowerCase()).filter(Boolean));
	const knownForms = new Set([
		...gradeForms,
		...familyLemmas.map((lemma) => lemma.trim().toLowerCase()),
	]);
	const targetKey = example.target.trim().toLowerCase();
	if (!gradeForms.has(targetKey)) {
		issues.push(issue(path, 'word_form', 'Đáp án điền phải là từ đang học hoặc một dạng của từ đó.', true));
	}
	if (targetKey && !knownForms.has(targetKey)) {
		issues.push(issue(path, 'target_form_unknown', 'Từ đích không phải dạng của từ đang học và không thuộc họ từ đã khai.', false));
	}
	if (!example.english.includes('___')) {
		if (example.targetStart == null) {
			issues.push(issue(path, 'target_ambiguous', 'Câu ví dụ cần vị trí từ đích vì từ đó không xuất hiện đúng một lần.', true));
		} else if (example.english.slice(example.targetStart, example.targetStart + example.target.length) !== example.target) {
			issues.push(issue(path, 'target_offset_mismatch', 'Vị trí từ đích không khớp với câu ví dụ.', true));
		}
	} else if (
		example.targetStart != null
		&& example.english.slice(example.targetStart, example.targetStart + example.target.length) !== example.target
	) {
		issues.push(issue(path, 'target_offset_mismatch', 'Vị trí từ đích không khớp với câu ví dụ.', true));
	}
	if (!isFullVietnameseMeaning(example.meaningVi, word.meaningVi)) {
		issues.push(issue(path, 'meaning_vi', 'Câu điền cần nghĩa tiếng Việt đầy đủ, không chỉ ghi nghĩa từ.', true));
	}
	if (!audioListed(example.audioFile, audioFiles)) {
		issues.push(issue(path, 'audio', 'Câu dùng để chấm cần file audio có trong bảng đối chiếu.', true));
	}
	if (example.alternativesTried.map((item) => item.trim()).filter(Boolean).length < EN_ALTERNATIVES_REQUIRED) {
		issues.push(issue(path, 'alternatives', `Cần thử ít nhất ${EN_ALTERNATIVES_REQUIRED} từ khác có thể điền.`, true));
	}
	const plausible = example.stillPlausible.map((item) => item.trim()).filter(Boolean);
	if (plausible.length > 0 && !example.adminCleared) {
		issues.push(issue(
			path,
			'ambiguous',
			`Còn từ khác hợp với cả câu Anh và nghĩa Việt: ${plausible.join(', ')}. Câu này chỉ được làm ví dụ học.`,
			true,
		));
	}
	return { index: exampleIndex, gradeEligible: issues.every((item) => !item.blocksGrade), issues };
}

function assessHints(word: PackWord, path: string, familyLemmas: string[], newPack: boolean, issues: ContentIssue[]) {
	const forbidden = uniqueTexts([
		word.lemma,
		...word.forms,
		...word.inflections.map((item) => item.form),
		...familyLemmas,
	]);
	word.hints.forEach((hint, index) => {
		const hintPath = `${path}.hints.${index}`;
		const leaked = forbidden.some((term) => containsWholeWord(hint.textEn, term) || containsWholeWord(hint.textVi, term));
		if (leaked) {
			issues.push(issue(hintPath, 'hint_leaks_lemma', 'Gợi ý không được chứa chính từ, một dạng chia, hoặc từ cùng họ.', true));
		}
		if (hint.textVi.trim() && normalizeLearnerText(hint.textVi) === normalizeLearnerText(word.meaningVi)) {
			issues.push(issue(hintPath, 'hint_equals_meaning', 'Gợi ý tiếng Việt không được trùng nguyên văn nghĩa của từ.', true));
		}
	});
	const orders = word.hints.map((hint) => hint.order);
	const continuous = orders.length === 0 || orders.every((order, index) => order === index + 1);
	if (!continuous) {
		issues.push(issue(path, 'hint_order_gap', 'Thứ tự gợi ý cần liền mạch từ 1, mơ hồ nhất trước.', newPack));
	}
	if (newPack && word.hints.length !== EN_HINTS_REQUIRED) {
		const code = word.hints.length > EN_HINTS_REQUIRED ? 'hint_too_many' : 'hint_too_few';
		issues.push(issue(path, code, `Mỗi nghĩa cần đúng ${EN_HINTS_REQUIRED} gợi ý, từ mơ hồ đến rõ.`, true));
	} else if (!newPack && word.hints.length > 0 && word.hints.length < EN_HINTS_REQUIRED) {
		issues.push(issue(path, 'hint_too_few', `Mỗi nghĩa nên có ít nhất ${EN_HINTS_REQUIRED} gợi ý.`, false));
	}
}

function assessWord(word: PackWord, index: number, pack: EnglishPack, newPack: boolean): AssessedWord {
	const path = `words.${word.lemma || index}`;
	const issues: ContentIssue[] = [];
	const familyLemmas = familyLemmasFor(pack, word.lemma);
	if (!word.lemma.trim()) issues.push(issue(path, 'lemma', 'Thiếu từ tiếng Anh.', true));
	if (!word.ipa.trim()) issues.push(issue(path, 'ipa', 'Thiếu IPA.', true));
	for (const [label, value] of [['ipa', word.ipa], ['ipaUk', word.ipaUk], ['ipaUs', word.ipaUs], ['ipaOverride', word.ipaOverride]] as const) {
		if (value.trim() && !IPA_RE.test(value.trim())) {
			issues.push(issue(path, 'ipa_format', `IPA (${label}) nên nằm trong dấu / /.`, false));
		}
	}
	if (!word.partOfSpeech.trim()) issues.push(issue(path, 'part_of_speech', 'Thiếu loại từ.', true));
	if (!word.meaningVi.trim()) issues.push(issue(path, 'meaning_vi', 'Thiếu nghĩa tiếng Việt của từ.', true));
	if (!word.definitionEn.trim()) {
		issues.push(issue(path, 'definition_missing', 'Thiếu định nghĩa tiếng Anh.', newPack));
	} else if (containsWholeWord(word.definitionEn, word.lemma)) {
		issues.push(issue(path, 'definition_mentions_lemma', 'Định nghĩa tiếng Anh không nên chứa chính từ đó.', false));
	}
	if (!word.cefr) issues.push(issue(path, 'cefr_missing', 'Thiếu trình độ CEFR của nghĩa.', newPack));
	if (word.senseKey.trim() && !SENSE_KEY_RE.test(word.senseKey.trim())) {
		issues.push(issue(path, 'sense_key_format', 'senseKey phải có dạng lemma.loại.nhãn, ví dụ decide.v.choose.', true));
	}
	if (word.entryType === 'word' || word.entryType === 'fixed_phrase') {
		const joined = word.syllables.join('').toLowerCase();
		const lemma = lemmaKeyOf(word.lemma).replace(/[\s-]/g, '');
		if (word.syllables.length > 0 && joined !== lemma) {
			issues.push(issue(path, 'syllables_mismatch', 'Ghép các âm tiết không ra đúng từ.', false));
		}
	}
	if (word.stressIndex != null && word.stressIndex >= word.syllables.length) {
		issues.push(issue(path, 'stress_index_range', 'Vị trí trọng âm nằm ngoài danh sách âm tiết.', true));
	}
	for (const topic of word.topics) {
		if (!topicSet.has(topic)) issues.push(issue(path, 'unknown_topic', `Chủ đề không có trong danh sách: ${topic}.`, false));
	}
	for (const tag of word.grammarTags) {
		if (!grammarTagSet.has(tag)) issues.push(issue(path, 'unknown_grammar_tag', `Nhãn ngữ pháp không có trong danh sách: ${tag}.`, false));
	}
	for (const inflection of word.inflections) {
		if (inflection.tag && !inflectionTagSet.has(inflection.tag)) {
			issues.push(issue(path, 'unknown_inflection_tag', `Nhãn dạng từ không có trong danh sách: ${inflection.tag}.`, false));
		}
	}
	for (const relation of word.relations) {
		if (lemmaKeyOf(relation.lemma) === lemmaKeyOf(word.lemma)) {
			issues.push(issue(path, 'relation_self', 'Quan hệ không được trỏ về chính từ đó.', true));
		}
		if (relation.kind === 'confusable' && !relation.confusableType) {
			issues.push(issue(path, 'confusable_type_missing', 'Cặp dễ nhầm cần loại nhầm: chính tả, âm, nghĩa, bạn giả, ngữ pháp, hoặc kết hợp từ.', false));
		}
		if (relation.kind === 'confusable' && relation.contrast.length !== 0 && relation.contrast.length !== 2) {
			issues.push(issue(path, 'contrast_count', 'Phân biệt một cặp dễ nhầm cần đúng hai vế, hoặc để trống.', true));
		}
		if (relation.mistake && normalizeLearnerText(relation.mistake.wrong) === normalizeLearnerText(relation.mistake.right)) {
			issues.push(issue(path, 'mistake_same', 'Câu sai và câu đúng của cặp dễ nhầm phải khác nhau.', true));
		}
	}
	for (const error of word.commonErrors) {
		if (!error.wrong.trim() || !error.right.trim() || !error.whyVi.trim()) {
			issues.push(issue(path, 'common_error_incomplete', 'Mỗi lỗi thường gặp cần câu sai, câu đúng và lời giải thích.', true));
		} else if (normalizeLearnerText(error.wrong) === normalizeLearnerText(error.right)) {
			issues.push(issue(path, 'common_error_same', 'Câu sai và câu đúng phải khác nhau.', true));
		}
	}
	assessHints(word, path, familyLemmas, newPack, issues);
	if (word.chunks.map((chunk) => chunk.text.trim()).filter(Boolean).length < 1) {
		issues.push(issue(path, 'collocation', 'Cần 1–6 cách nói.', true));
	}
	const forbiddenDistractors = new Set([
		...familyLemmas.map((lemma) => lemmaKeyOf(lemma)),
		...word.relations.filter((relation) => relation.kind === 'confusable').map((relation) => lemmaKeyOf(relation.lemma)),
	]);
	const blocked = word.distractorLemmas.filter((lemma) => forbiddenDistractors.has(lemmaKeyOf(lemma)));
	if (blocked.length > 0) {
		issues.push(issue(path, 'distractor_blocked', `Phương án nhiễu không được là từ dễ nhầm hoặc từ cùng họ: ${blocked.join(', ')}.`, true));
	}
	if (!audioListed(word.audioFile, pack.audioFiles)) {
		issues.push(issue(path, 'audio', 'Từ cần file audio có trong bảng đối chiếu trước khi xuất bản.', true));
	}
	if (word.distractorMeanings.length < 2) {
		issues.push(issue(path, 'distractors', 'Cần ít nhất hai nghĩa dễ nhầm để làm câu chọn nghĩa.', true));
	}
	if (word.distractorLemmas.length < 2) {
		issues.push(issue(path, 'distractor_lemmas', 'Cần ít nhất hai từ dễ nhầm để làm câu nghe–chọn.', true));
	}
	const examples = word.examples.map((example, exampleIndex) => assessExample(word, example, exampleIndex, pack.audioFiles, familyLemmas));
	const gradeExampleCount = examples.filter((example) => example.gradeEligible).length;
	if (gradeExampleCount < EN_USAGE_MIN_GRADE_EXAMPLES) {
		issues.push(issue(
			path,
			'usage_examples',
			`Cần ít nhất ${EN_USAGE_MIN_GRADE_EXAMPLES} câu điền đã đủ điều kiện trước khi mở kỹ năng dùng từ.`,
			true,
		));
	}
	const blocking = issues.filter((item) => item.blocksGrade && item.code !== 'usage_examples');
	return {
		index,
		publishable: blocking.length === 0,
		gradeExampleCount,
		examples,
		issues: [...issues, ...examples.flatMap((example) => example.issues)],
	};
}

function assessPattern(pattern: PackPattern, index: number, audioFiles: string[]): AssessedPattern {
	const path = `patterns.${index}`;
	const issues: ContentIssue[] = [];
	if (!pattern.purposeVi.trim()) issues.push(issue(path, 'purpose', 'Thiếu mục đích giao tiếp của mẫu câu.', true));
	if (!pattern.frame.includes('___')) issues.push(issue(path, 'frame', 'Khung mẫu cần có vị trí thay thế ___ .', true));
	if (pattern.fixedParts.map((part) => part.trim()).filter(Boolean).length < 1) {
		issues.push(issue(path, 'fixed_parts', 'Cần ít nhất một phần cố định để chấm.', true));
	}
	const blanks = pattern.frame.split('___').length - 1;
	if (pattern.slots.length !== blanks) {
		issues.push(issue(path, 'slots', 'Số vị trí thay thế phải khớp với số chỗ ___ trong khung.', true));
	}
	if (pattern.slots.some((slot) => !slot.id.trim() || !slot.labelVi.trim() || slot.choices.filter(Boolean).length < 1)) {
		issues.push(issue(path, 'slot_choices', 'Mỗi vị trí thay thế cần nhãn và ít nhất một lựa chọn.', true));
	}
	if (pattern.examples.length < EN_PATTERN_MIN_EXAMPLES) {
		issues.push(issue(path, 'examples', `Mẫu câu cần ít nhất ${EN_PATTERN_MIN_EXAMPLES} ví dụ với bộ thành phần khác nhau.`, true));
	}
	pattern.examples.forEach((example, exampleIndex) => {
		const examplePath = `${path}.examples.${exampleIndex}`;
		if (!isFullVietnameseMeaning(example.meaningVi, pattern.purposeVi)) {
			issues.push(issue(examplePath, 'meaning_vi', 'Ví dụ mẫu câu cần nghĩa tiếng Việt đầy đủ.', true));
		}
		if (!audioListed(example.audioFile, audioFiles)) {
			issues.push(issue(examplePath, 'audio', 'Ví dụ mẫu câu cần file audio có trong bảng đối chiếu.', true));
		}
		if (!fixedPartsInOrder(example.english, pattern.fixedParts)) {
			issues.push(issue(examplePath, 'fixed_parts', 'Câu ví dụ phải chứa các phần cố định đúng thứ tự.', true));
		}
		const missingSlot = pattern.slots.some((slot) => !example.slotValues.some((value) => value.id === slot.id && value.value.trim()));
		if (missingSlot) issues.push(issue(examplePath, 'slot_values', 'Ví dụ thiếu giá trị cho vị trí thay thế.', true));
	});
	return { index, publishable: issues.length === 0, issues };
}

export function assessEnglishPack(input: unknown): AssessedPack {
	const parsed = englishPackSchema.safeParse(input);
	if (!parsed.success) {
		const message = parsed.error.issues[0]?.message ?? 'Gói nội dung không đúng cấu trúc.';
		return { schemaError: message, pack: null, issues: [], words: [], patterns: [] };
	}
	if (!parsed.data.title.trim()) {
		const titleIssue = issue('title', 'title', 'Thiếu tên bộ học.', true);
		return { schemaError: null, pack: parsed.data, issues: [titleIssue], words: [], patterns: [] };
	}
	const newPack = packIsNew(parsed.data);
	const pack = normalizeEnglishPack(parsed.data);
	const words = pack.words.map((word, index) => assessWord(word, index, pack, newPack));
	const patterns = pack.patterns.map((pattern, index) => assessPattern(pattern, index, pack.audioFiles));
	const issues = [
		...words.flatMap((word) => word.issues),
		...patterns.flatMap((pattern) => pattern.issues),
	];
	return { schemaError: null, pack, issues, words, patterns };
}
