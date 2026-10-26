import { describe, expect, it } from 'vitest';
import { poolFromBundles, promptHidesAnswer } from '@/lib/english/activities';
import { mulberry32 } from '@/lib/english/activities/rng';
import { pickQuizSenses, quizItemFor } from '@/lib/english/quiz';
import type { SenseBundle } from '@/lib/english/senseBundle';

function bundle(id: number): SenseBundle {
 const lemma = `word${id}`;
 return { sense: { id: lemma, senseKey: null, meaningVi: `nghĩa ${id}`, definitionEn: '', definitionEnSimple: '', cefr: null, register: '', region: '', topics: [], grammarTags: [], grammarNoteVi: '', pitfallVi: '', chunks: [], commonErrors: [], distractorLemmas: [], distractorMeanings: [], ipaOverride: '', partOfSpeech: 'noun' }, word: { id: lemma, lemma, lemmaKey: lemma, ipa: '', ipaUk: '', ipaUs: '', syllables: [], stressIndex: null, stress: '', forms: [], inflections: [], cefr: null, frequencyRank: null, entryType: 'word', audioPath: '', audioUkPath: '', audioUsPath: '' }, examples: [], hints: [], relations: [], families: [] };
}
const words = Array.from({ length: 24 }, (_, index) => bundle(index));
describe('new quiz rules', () => {
 it('takes at most 20 words and prioritizes lapsed words', () => {
  const picked = pickQuizSenses(words.map((entry, index) => ({ senseId: entry.sense.id, lapses: index === 23 ? 4 : 0, box: 0 })), 30, mulberry32(1));
  expect(picked).toHaveLength(20);
  expect(picked[0]?.senseId).toBe('word23');
 });
 it.each(['mcq', 'fill', 'listen'] as const)('builds %s without revealing answers in prompt', (kind) => {
  const item = quizItemFor(kind, words[0]!, { pool: poolFromBundles(words), rng: mulberry32(2), allowSyntheticAudio: true });
  expect(item).not.toBeNull();
  expect(promptHidesAnswer(item!)).toBe(true);
  expect(item!.prompt).not.toHaveProperty('answerKey');
  if (kind === 'fill') expect(item!.prompt.mode).toBe('meaning');
 });
});
