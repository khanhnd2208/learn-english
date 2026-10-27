import { describe, expect, it } from 'vitest';
import { AI_PACK_PROMPT_EXAMPLE, buildAiPackPrompt } from '@/lib/english/aiPackPrompt';
import { assessEnglishPack, type EnglishPack } from '@/lib/english/contentValidation';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { locateTarget } from '@/lib/english/text';

function pack(): EnglishPack {
	return structuredClone(sampleEnglishPack);
}

function codes(result: ReturnType<typeof assessEnglishPack>, lemma = 'borrow') {
	const word = result.words.find((item) => result.pack?.words[item.index]?.lemma === lemma);
	return {
		word,
		codes: new Set(word?.issues.map((item) => item.code) ?? []),
		issue(code: string) {
			return word?.issues.find((item) => item.code === code);
		},
	};
}

describe('locateTarget', () => {
	it('finds one match, ignores case, and refuses a longer word or two hits', () => {
		expect(locateTarget('I borrowed a pen.', 'borrowed')).toEqual({ start: 2, length: 8 });
		expect(locateTarget('Please Lend it.', 'lend')).toEqual({ start: 7, length: 4 });
		expect(locateTarget('The lender called.', 'lend')).toBe('missing');
		expect(locateTarget('I can lend you this, but I can lend you that.', 'lend')).toBe('ambiguous');
		expect(locateTarget('Nothing here.', 'lend')).toBe('missing');
	});
});

describe('english pack vocabulary rules', () => {
	it('accepts the sample pack and fills a single target offset', () => {
		const source = pack();
		source.words[0]!.examples[3]!.targetStart = null;
		const result = assessEnglishPack(source);
		expect(result.schemaError).toBeNull();
		expect(result.words[0]?.publishable).toBe(true);
		expect(result.pack?.words[0]?.examples[3]?.targetStart).toBe(2);
		expect(result.pack?.words[0]?.examples[3]?.targetLength).toBe(8);
		expect(codes(result).codes.has('hint_leaks_lemma')).toBe(false);
	});

	it('warns when a hint leaks the lemma, an inflection, or a family member', () => {
		for (const text of ['You borrow a pen.', 'She borrowed it.', 'Ask the borrower.']) {
			const source = pack();
			source.words[0]!.hints[0]!.textEn = text;
			const result = assessEnglishPack(source);
			expect(codes(result).issue('hint_leaks_lemma')?.blocksGrade).toBe(false);
			expect(result.words[0]?.publishable).toBe(true);
		}
	});

	it('only warns about hints, which are optional content', () => {
		const same = pack();
		same.words[0]!.hints[0]!.textVi = 'Mượn';
		expect(codes(assessEnglishPack(same)).issue('hint_equals_meaning')?.blocksGrade).toBe(false);

		const gap = pack();
		gap.words[0]!.hints[0]!.order = 1;
		gap.words[0]!.hints[1]!.order = 2;
		gap.words[0]!.hints[2]!.order = 4;
		const gapped = assessEnglishPack(gap);
		expect(codes(gapped).issue('hint_order_gap')?.blocksGrade).toBe(false);
		expect(gapped.words[0]?.publishable).toBe(true);

		const few = pack();
		few.words[0]!.hints = [few.words[0]!.hints[0]!];
		const short = assessEnglishPack(few);
		expect(codes(short).issue('hint_too_few')?.blocksGrade).toBe(false);
		expect(short.words[0]?.publishable).toBe(true);

		const extra = pack();
		extra.words[0]!.hints.push({ ...extra.words[0]!.hints[0]!, textEn: 'One more clue about giving something back later.', textVi: 'Thêm một manh mối về việc đưa lại sau.' });
		expect(codes(assessEnglishPack(extra)).issue('hint_too_many')?.blocksGrade).toBe(false);
	});

	it('keeps an old collocation list, rejects blocked distractors, and warns on unequal errors', () => {
		const legacy = pack();
		legacy.words[0]!.chunks = [];
		const converted = assessEnglishPack(legacy);
		expect(converted.schemaError).toBeNull();
		expect(converted.pack?.words[0]?.chunks.map((chunk) => chunk.text)).toEqual(['borrow a pen', 'borrow money']);

		const blocked = pack();
		blocked.words[0]!.distractorLemmas = ['lend', 'return'];
		expect(codes(assessEnglishPack(blocked)).issue('distractor_blocked')?.blocksGrade).toBe(true);

		const same = pack();
		same.words[0]!.commonErrors = [{ wrong: 'I happy.', right: 'I happy.', whyVi: 'Giống nhau.' }];
		expect(codes(assessEnglishPack(same)).issue('common_error_same')?.blocksGrade).toBe(false);

		const contrast = pack();
		contrast.words[0]!.relations[0]!.contrast = [{ lemma: 'borrow', en: 'I borrow a pen.', vi: 'Tôi mượn bút.' }];
		expect(codes(assessEnglishPack(contrast)).issue('contrast_count')?.blocksGrade).toBe(false);
	});

	it('requires CEFR on a new pack and only warns about a missing English definition', () => {
		const missing = pack();
		missing.words[0]!.definitionEn = '';
		expect(codes(assessEnglishPack(missing)).issue('definition_missing')?.blocksGrade).toBe(false);

		const mentioned = pack();
		mentioned.words[0]!.definitionEn = 'to borrow something for a while';
		const mention = assessEnglishPack(mentioned);
		expect(codes(mention).issue('definition_mentions_lemma')?.blocksGrade).toBe(false);
		expect(mention.words[0]?.publishable).toBe(true);

		const noLevel = pack();
		noLevel.words[0]!.cefr = null;
		expect(codes(assessEnglishPack(noLevel)).issue('cefr_missing')?.blocksGrade).toBe(true);

		const old = pack();
		old.packVersion = 1;
		old.families = [];
		for (const word of old.words) {
			word.senseKey = '';
			word.definitionEn = '';
			word.definitionEnSimple = '';
			word.cefr = null;
			word.ipaUk = '';
			word.ipaUs = '';
			word.syllables = [];
			word.stressIndex = null;
			word.inflections = [];
			word.frequencyRank = null;
			word.topics = [];
			word.grammarTags = [];
			word.grammarNoteVi = '';
			word.ipaOverride = '';
			word.imageFile = '';
			word.hints = [];
			word.relations = [];
			word.entryType = 'word';
			word.register = 'neutral';
			word.region = 'both';
			for (const example of word.examples) {
				example.targetStart = null;
				example.targetTag = '';
				example.cefr = null;
				example.origin = 'authored';
				example.sourceNote = '';
			}
		}
		const legacy = assessEnglishPack(old);
		expect(codes(legacy).issue('definition_missing')?.blocksGrade).toBe(false);
		expect(codes(legacy).issue('cefr_missing')?.blocksGrade).toBe(false);
		expect(codes(legacy).issue('hint_too_few')).toBeUndefined();
		expect(legacy.words.every((word) => word.publishable)).toBe(true);
	});

	it('checks target position, unknown forms, and self relations', () => {
		const offset = pack();
		offset.words[0]!.examples[3]!.targetStart = 0;
		expect(codes(assessEnglishPack(offset)).issue('target_offset_mismatch')?.blocksGrade).toBe(true);

		const ambiguous = pack();
		const example = ambiguous.words[1]!.examples[0]!;
		example.english = 'I can lend you this, but I can lend you that.';
		example.target = 'lend';
		example.targetStart = null;
		expect(codes(assessEnglishPack(ambiguous), 'lend').issue('target_ambiguous')?.blocksGrade).toBe(true);

		const unknown = pack();
		unknown.words[0]!.examples[0]!.target = 'banana';
		const unknownIssue = codes(assessEnglishPack(unknown)).issue('target_form_unknown');
		expect(unknownIssue?.blocksGrade).toBe(false);

		const self = pack();
		self.words[0]!.relations[0]!.lemma = 'Borrow';
		expect(codes(assessEnglishPack(self)).issue('relation_self')?.blocksGrade).toBe(true);

		const loose = pack();
		loose.words[0]!.relations[0]!.confusableType = null;
		const looseResult = assessEnglishPack(loose);
		expect(codes(looseResult).issue('confusable_type_missing')?.blocksGrade).toBe(false);
		expect(looseResult.words[0]?.publishable).toBe(true);
	});

	it('warns on IPA, syllables, topics and stress, and blocks a bad sense key', () => {
		const ipa = pack();
		ipa.words[0]!.ipa = 'bɒrəʊ';
		ipa.words[0]!.ipaUk = '';
		ipa.words[0]!.ipaUs = '';
		expect(codes(assessEnglishPack(ipa)).issue('ipa_format')?.blocksGrade).toBe(false);

		const syllables = pack();
		syllables.words[0]!.syllables = ['nope'];
		expect(codes(assessEnglishPack(syllables)).issue('syllables_mismatch')?.blocksGrade).toBe(false);

		const stress = pack();
		stress.words[0]!.stressIndex = 5;
		expect(codes(assessEnglishPack(stress)).issue('stress_index_range')?.blocksGrade).toBe(false);
		expect(assessEnglishPack(stress).words[0]?.publishable).toBe(true);

		const key = pack();
		key.words[0]!.senseKey = 'Borrow';
		expect(codes(assessEnglishPack(key)).issue('sense_key_format')?.blocksGrade).toBe(true);

		const topic = pack();
		topic.words[0]!.topics = ['space'];
		expect(codes(assessEnglishPack(topic)).issue('unknown_topic')?.blocksGrade).toBe(false);

		const grammar = pack();
		grammar.words[0]!.grammarTags = ['+foo'];
		expect(codes(assessEnglishPack(grammar)).issue('unknown_grammar_tag')?.blocksGrade).toBe(false);
	});

	it('rejects a pack with more than six collocations', () => {
		const source = pack();
		source.words[0]!.collocations = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
		expect(assessEnglishPack(source).schemaError).toBeTruthy();
	});

	it('accepts long chunk and common error lists but still needs one chunk', () => {
		const long = pack();
		long.words[0]!.chunks = Array.from({ length: 12 }, (_, index) => ({ text: `borrow thing ${index}`, vi: 'mượn đồ' }));
		long.words[0]!.commonErrors = Array.from({ length: 8 }, (_, index) => ({ wrong: `I borrow you ${index}.`, right: `I lend you ${index}.`, whyVi: 'lend là cho mượn.' }));
		const result = assessEnglishPack(long);
		expect(result.schemaError).toBeNull();
		expect(codes(result).word?.publishable).toBe(true);

		const empty = pack();
		empty.words[0]!.chunks = [];
		empty.words[0]!.collocations = [];
		expect(codes(assessEnglishPack(empty)).issue('collocation')?.message).toBe('Cần ít nhất 1 cách nói.');
	});
});

describe('AI pack prompt', () => {
	it('keeps its worked example publishable with two graded examples', () => {
		const result = assessEnglishPack(AI_PACK_PROMPT_EXAMPLE);
		expect(result.schemaError).toBeNull();
		expect(codes(result, 'belonging').word?.publishable).toBe(true);
		expect(codes(result, 'belonging').word?.gradeExampleCount).toBeGreaterThanOrEqual(2);
	});

	it('ends with the admin word list and embeds the example as valid JSON', () => {
		const prompt = buildAiPackPrompt('belonging\ngive up', 'Feelings');
		expect(prompt.trimEnd().endsWith('belonging\ngive up')).toBe(true);
		expect(prompt).toContain('Tên bộ (title): Feelings');
		const json = prompt.match(/```json\n([\s\S]*?)\n```/)?.[1];
		expect(JSON.parse(json ?? '')).toEqual(AI_PACK_PROMPT_EXAMPLE);
	});
});
