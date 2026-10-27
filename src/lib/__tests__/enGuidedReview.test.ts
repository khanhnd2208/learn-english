import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/english/activities/rng';
import { buildGuidedQuestions, reviewWeight, weightedOrder } from '@/lib/english/guidedReview';
import type { SenseBundle } from '@/lib/english/senseBundle';

function bundle(index: number): SenseBundle {
	const lemma = `word${index}`;
	return {
		sense: { id: lemma, senseKey: null, meaningVi: `nghĩa ${index}`, definitionEn: '', definitionEnSimple: '', cefr: null, register: '', region: '', topics: [], grammarTags: [], grammarNoteVi: '', pitfallVi: '', chunks: [], commonErrors: [], distractorLemmas: [], distractorMeanings: [], ipaOverride: '', partOfSpeech: 'noun' },
		word: { id: lemma, lemma, lemmaKey: lemma, ipa: '/test/', ipaUk: '', ipaUs: '', syllables: [], stressIndex: null, stress: '', forms: [], inflections: [], cefr: null, frequencyRank: null, entryType: 'word', audioPath: `${lemma}.mp3`, audioUkPath: '', audioUsPath: '' },
		examples: [{ id: `ex-${index}`, english: `Use ${lemma} here.`, meaningVi: `Dùng nghĩa ${index} ở đây.`, target: lemma, targetStart: 4, targetLength: lemma.length, targetTag: 'base', cefr: null, audioPath: '', sortOrder: 0 }],
		hints: [], relations: [], families: [],
	};
}

describe('guided review selection', () => {
	it('gives more weight to rarely practiced and often missed words', () => {
		expect(reviewWeight({ attempts: 0, recentWrong: 0, recentTotal: 0 })).toBeGreaterThan(reviewWeight({ attempts: 20, recentWrong: 0, recentTotal: 20 }));
		expect(reviewWeight({ attempts: 10, recentWrong: 10, recentTotal: 10 })).toBeGreaterThan(reviewWeight({ attempts: 10, recentWrong: 0, recentTotal: 10 }));
	});

	it('returns every sense once in deterministic weighted order', () => {
		const ids = ['a', 'b', 'a', 'c'];
		const ordered = weightedOrder(ids, [{ senseId: 'c', attempts: 0, recentWrong: 5, recentTotal: 5 }], mulberry32(4));
		expect(new Set(ordered)).toEqual(new Set(['a', 'b', 'c']));
		expect(ordered).toHaveLength(3);
	});
});

describe('guided review questions', () => {
	it('builds one question per word without listen-and-type activities', () => {
		const words = Array.from({ length: 8 }, (_, index) => bundle(index));
		const questions = buildGuidedQuestions(words.slice(0, 5), words, mulberry32(8));
		expect(questions).toHaveLength(5);
		expect(new Set(questions.map((question) => question.senseId)).size).toBe(5);
		expect(questions.every((question) => !['listen_type', 'match_pairs', 'speak_shadow'].includes(question.activityKey))).toBe(true);
		expect(questions.filter((question) => question.layout !== null).length).toBeGreaterThanOrEqual(2);
		expect(new Set(questions.map((question) => question.activityKey)).size).toBeGreaterThanOrEqual(3);
		expect(questions[0]?.senseId).not.toBe(words[4]?.sense.id);
	});
});
