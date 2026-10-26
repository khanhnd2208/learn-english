import { describe, expect, it } from 'vitest';
import { previewEnglishPack } from '@/lib/english/packPreview';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { clozeOf, runtimeHints, toSenseBundle, type SenseBundleSource } from '@/lib/english/senseBundle';

function source(overrides: Partial<SenseBundleSource> = {}): SenseBundleSource {
	return {
		id: 'sense-1',
		senseKey: 'decide.v.choose',
		meaningVi: 'quyết định',
		definitionEn: 'to choose after thinking',
		definitionEnSimple: 'to choose what you will do',
		cefr: 'a2',
		register: 'neutral',
		region: 'both',
		topics: ['daily_life'],
		grammarTags: ['transitive'],
		grammarNoteVi: '',
		pitfallVi: '',
		chunks: [{ text: 'decide to do something', vi: 'quyết định làm gì' }],
		commonErrors: [{ wrong: 'I decided going.', right: 'I decided to go.', whyVi: 'decide đi với to + động từ.' }],
		distractorLemmas: ['choose'],
		distractorMeanings: ['chọn'],
		ipaOverride: '',
		partOfSpeech: 'verb',
		word: {
			id: 'word-1',
			lemma: 'decide',
			lemmaKey: 'decide',
			ipa: '/dɪˈsaɪd/',
			ipaUk: '/dɪˈsaɪd/',
			ipaUs: '/dɪˈsaɪd/',
			syllables: ['de', 'cide'],
			stressIndex: 1,
			stress: 'de-CIDE',
			forms: ['decided'],
			inflections: [{ form: 'decided', tag: 'past' }],
			cefr: 'a2',
			frequencyRank: 612,
			entryType: 'word',
			audioPath: '',
			audioUkPath: '',
			audioUsPath: '',
			familyLinks: [{
				family: {
					id: 'fam-1',
					key: 'decide',
					kind: 'derivation',
					root: 'decide',
					meaningVi: 'quyết định',
					meaningEn: '',
					originNote: '',
					members: [
						{ lemma: 'decision', wordId: null, partOfSpeech: 'noun', affixNote: '+ -ion', meaningVi: 'sự quyết định', sortOrder: 1 },
						{ lemma: 'decide', wordId: 'word-1', partOfSpeech: 'verb', affixNote: '', meaningVi: 'quyết định', sortOrder: 0 },
					],
				},
			}],
		},
		examples: [
			{
				id: 'ex-draft',
				english: 'Draft sentence decided.',
				meaningVi: 'Câu nháp.',
				target: 'decided',
				targetStart: 14,
				targetLength: 7,
				targetTag: 'past',
				cefr: 'a2',
				audioPath: '',
				sortOrder: 1,
				status: 'draft',
			},
			{
				id: 'ex-1',
				english: 'We decided to stay.',
				meaningVi: 'Chúng tôi quyết định ở lại.',
				target: 'decided',
				targetStart: 3,
				targetLength: 7,
				targetTag: 'past',
				cefr: 'a2',
				audioPath: 'decide.mp3',
				sortOrder: 0,
				status: 'published',
			},
		],
		hints: [
			{ id: 'h2', order: 2, kind: 'function', textEn: 'It ends the wait.', textVi: 'Nó chấm dứt lúc chờ.', cefr: 'a2', status: 'published' },
			{ id: 'h1', order: 1, kind: 'context', textEn: 'At a restaurant.', textVi: 'Ở nhà hàng.', cefr: 'a2', status: 'published' },
			{ id: 'h0', order: 0, kind: 'category', textEn: 'Hidden.', textVi: 'Ẩn.', cefr: null, status: 'draft' },
		],
		relations: [
			{
				id: 'rel-1',
				kind: 'confusable',
				lemma: 'decision',
				targetSenseId: null,
				confusableType: 'grammar',
				noteVi: 'danh từ',
				contrast: [
					{ lemma: 'decide', en: 'We decided to stay.', vi: 'Chúng tôi quyết định ở lại.' },
					{ lemma: 'decision', en: 'It was a hard decision.', vi: 'Đó là một quyết định khó.' },
				],
				mistake: { wrong: 'I made a decide.', right: 'I made a decision.' },
				sortOrder: 0,
			},
		],
		...overrides,
	};
}

describe('toSenseBundle', () => {
	it('keeps published rows, sorts hints, and includes family members', () => {
		const bundle = toSenseBundle(source());
		expect(bundle.examples.map((example) => example.id)).toEqual(['ex-1']);
		expect(bundle.hints.map((hint) => hint.id)).toEqual(['h1', 'h2']);
		expect(bundle.relations[0]?.lemma).toBe('decision');
		expect(bundle.families[0]?.members.map((member) => member.lemma)).toEqual(['decide', 'decision']);
		expect(bundle.word.inflections).toEqual([{ form: 'decided', tag: 'past' }]);
		expect(bundle.sense.chunks).toEqual([{ text: 'decide to do something', vi: 'quyết định làm gì' }]);
		expect(bundle.sense.commonErrors[0]?.whyVi).toContain('to + động từ');
		expect(bundle.relations[0]?.contrast).toHaveLength(2);
		expect(bundle.relations[0]?.mistake).toEqual({ wrong: 'I made a decide.', right: 'I made a decision.' });
	});
});

describe('runtimeHints', () => {
	it('builds letter, syllable, and masked IPA clues from the word', () => {
		const hints = runtimeHints(toSenseBundle(source()));
		expect(hints.map((hint) => hint.kind)).toEqual(['first_letter', 'letter_count', 'syllable_count', 'ipa_masked']);
		expect(hints[0]?.textEn).toContain('D');
		expect(hints[1]?.textVi).toContain('6');
		expect(hints[2]?.textEn).toContain('2');
		expect(hints[3]?.textEn).toContain('/dɪ…/');
	});

	it('uses the sense pronunciation when the meaning is pronounced differently', () => {
		const row = source();
		row.ipaOverride = '/ˈrekɔːd/';
		const hints = runtimeHints(toSenseBundle(row));
		expect(hints.find((hint) => hint.kind === 'ipa_masked')?.textEn).toContain('/ˈr…/');
	});
});

describe('clozeOf', () => {
	it('splits a sentence at the stored offset and refuses a mismatch', () => {
		expect(clozeOf({
			english: 'We decided to stay.',
			target: 'decided',
			targetStart: 3,
			targetLength: 7,
			targetTag: 'past',
		})).toEqual({ before: 'We ', answer: 'decided', after: ' to stay.', tag: 'past' });
		expect(clozeOf({
			english: 'We decided to stay.',
			target: 'decided',
			targetStart: null,
			targetLength: null,
			targetTag: 'past',
		})).toBeNull();
		expect(clozeOf({
			english: 'We decided to stay.',
			target: 'borrowed',
			targetStart: 3,
			targetLength: 7,
			targetTag: 'past',
		})).toBeNull();
	});
});

describe('previewEnglishPack', () => {
	it('shows the sample confusable pair and the cloze offset', () => {
		const preview = previewEnglishPack(sampleEnglishPack);
		const borrow = preview.words.find((word) => word.lemma === 'borrow');
		expect(preview.families[0]?.members.map((member) => member.lemma)).toEqual(['borrow', 'borrower']);
		expect(borrow?.definitionEn).toContain('another person');
		expect(borrow?.relations[0]).toMatchObject({ kind: 'confusable', lemma: 'lend', confusableType: 'meaning' });
		expect(borrow?.examples.some((example) => example.target === 'borrowed' && example.targetStart === 2)).toBe(true);
	});
});
