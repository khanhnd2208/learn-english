import { describe, expect, it } from 'vitest';
import { activityByKey, chooseDistractors, poolFromBundles } from '@/lib/english/activities';
import { mulberry32 } from '@/lib/english/activities/rng';
import type { SenseBundle } from '@/lib/english/senseBundle';

function sense(id: string, lemma: string, meaning: string, options: {
	audio?: boolean;
	confusable?: string;
	family?: string;
	cloze?: boolean;
} = {}): SenseBundle {
	const english = `I ${lemma} this now.`;
	return {
		sense: {
			id,
			senseKey: `${lemma}.v.test`,
			meaningVi: meaning,
			definitionEn: '',
			definitionEnSimple: '',
			cefr: 'a2',
			register: 'neutral',
			region: 'both',
			topics: [],
			grammarTags: [],
			grammarNoteVi: '',
			pitfallVi: '',
			chunks: [{ text: `${lemma} something`, vi: meaning }],
			commonErrors: [],
			distractorLemmas: [],
			distractorMeanings: [],
			ipaOverride: '',
			partOfSpeech: 'verb',
		},
		word: {
			id: `word-${id}`,
			lemma,
			lemmaKey: lemma,
			ipa: '/test/',
			ipaUk: '',
			ipaUs: '',
			syllables: [lemma],
			stressIndex: 0,
			stress: lemma,
			forms: [lemma],
			inflections: [],
			cefr: 'a2',
			frequencyRank: null,
			entryType: 'word',
			audioPath: options.audio === false ? '' : `${lemma}.mp3`,
			audioUkPath: '',
			audioUsPath: '',
		},
		examples: options.cloze === false ? [] : [{
			id: `ex-${id}`,
			english,
			meaningVi: `Tôi ${meaning} cái này ngay bây giờ.`,
			target: lemma,
			targetStart: 2,
			targetLength: lemma.length,
			targetTag: 'base',
			cefr: 'a2',
			audioPath: '',
			sortOrder: 0,
		}],
		hints: [],
		relations: options.confusable ? [{
			id: `rel-${id}`,
			kind: 'confusable',
			lemma: options.confusable,
			targetSenseId: null,
			confusableType: 'meaning',
			noteVi: '',
			contrast: [],
			mistake: null,
			sortOrder: 0,
		}] : [],
		families: options.family ? [{
			id: `fam-${id}`,
			key: lemma,
			kind: 'derivation',
			root: lemma,
			meaningVi: meaning,
			meaningEn: '',
			originNote: '',
			members: [
				{ lemma, wordId: `word-${id}`, partOfSpeech: 'verb', affixNote: '', meaningVi: meaning, sortOrder: 0 },
				{ lemma: options.family, wordId: null, partOfSpeech: 'noun', affixNote: '', meaningVi: '', sortOrder: 1 },
			],
		}] : [],
	};
}

const poolSenses = [
	sense('borrow', 'borrow', 'mượn', { confusable: 'lend', family: 'borrower' }),
	sense('lend', 'lend', 'cho mượn'),
	sense('return', 'return', 'trả lại'),
	sense('keep', 'keep', 'giữ'),
	sense('share', 'share', 'chia'),
	sense('offer', 'offer', 'mời'),
];

describe('distractors', () => {
	it('keeps confusables and family members out of choices and prefers words outside the test', () => {
		const focus = poolSenses[0]!;
		const pool = poolFromBundles([...poolSenses, sense('borrower', 'borrower', 'người mượn')], {
			inTestIds: new Set(['borrow', 'lend', 'return']),
			sameSetIds: new Set(['borrow', 'lend', 'return', 'keep']),
		});
		const picked = chooseDistractors(focus, pool, 3, true).map((entry) => entry.lemma);
		expect(picked).not.toContain('lend');
		expect(picked).not.toContain('borrower');
		expect(picked.every((lemma) => !['borrow', 'lend', 'return'].includes(lemma))).toBe(true);
	});
});

describe('activity build', () => {
	const ctx = {
		pool: poolFromBundles(poolSenses),
		rng: mulberry32(3),
	};

	it('returns null when the sense lacks audio or a cloze', () => {
		const quiet = sense('quiet', 'quiet', 'yên', { audio: false, cloze: false });
		expect(activityByKey('listen_choice')?.build(quiet, ctx)).toBeNull();
		expect(activityByKey('listen_type')?.build(quiet, ctx)).toBeNull();
		expect(activityByKey('speak_shadow')?.build(quiet, ctx)).toBeNull();
		expect(activityByKey('cloze_choice')?.build(quiet, ctx)).toBeNull();
	});

	it('allows browser speech only in practice while keeping tests audio-file-only', () => {
		const quiet = sense('quiet', 'quiet', 'yên', { audio: false });
		expect(activityByKey('listen_choice')?.build(quiet, { ...ctx, allowSyntheticAudio: true })).not.toBeNull();
		expect(activityByKey('listen_type')?.build(quiet, { ...ctx, allowSyntheticAudio: true })).not.toBeNull();
		expect(activityByKey('speak_shadow')?.build(quiet, { ...ctx, allowSyntheticAudio: true })).not.toBeNull();
		expect(activityByKey('listen_type')?.build(quiet, ctx)).toBeNull();
	});

	it('grades a typed answer with the shared normaliser', () => {
		const item = activityByKey('recall_type')?.build(poolSenses[0]!, { ...ctx, rng: mulberry32(1) });
		expect(item).not.toBeNull();
		expect(activityByKey('recall_type')?.grade?.(item!, 'Borrow!')).toBe(true);
		expect(activityByKey('recall_type')?.grade?.(item!, '')).toBe(false);
	});
});
