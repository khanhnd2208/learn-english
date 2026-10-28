import { describe, expect, it } from 'vitest';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { AI_PACK_PROMPT_EXAMPLE } from '@/lib/english/aiPackPrompt';
const clone = () => structuredClone(sampleEnglishPack);
const codes = (p: unknown) => assessEnglishPack(p).issues.map((i) => i.code);
describe('v4 content validation', () => {
 it('accepts the sample and prompt example without any warning', () => { for (const p of [sampleEnglishPack, AI_PACK_PROMPT_EXAMPLE]) expect(assessEnglishPack(p).issues).toEqual([]); });
 it('rejects old versions and legacy fields', () => { expect(assessEnglishPack({ ...clone(), packVersion: 2 }).schemaError).toContain('định dạng cũ'); expect(assessEnglishPack({ ...clone(), hints: [] }).schemaError).toContain('sai cấu trúc'); });
 it('names the broken path of a v4 pack', () => { const p = clone() as unknown as { words: Array<{ quizExamples: unknown }> }; p.words[1]!.quizExamples = 'x'; expect(assessEnglishPack(p).schemaError).toContain('words.1.quizExamples'); });
 it('upgrades v3 packs: the non-gradable sentence goes on the card, gradable ones become hidden questions', () => {
  const a = assessEnglishPack({ title: 'Cũ', description: '', packVersion: 3, audioFiles: ['tired.mp3'], words: [{ lemma: 'tired', senseKey: 'tired.adj.lacking_energy', partOfSpeech: 'adjective', ipa: '/ˈtaɪɚd/', audioFile: 'tired.mp3', forms: [], meaningVi: 'mệt mỏi', synonyms: [], noteVi: '', advanced: [], examples: [
   { english: "I'm tired because I only slept four hours last night.", meaningVi: 'Tôi mệt vì tối qua chỉ ngủ được bốn tiếng.', target: 'tired', gradable: true },
   { english: 'He feels tired after standing all day at work.', meaningVi: 'Anh ấy thấy mệt sau khi đứng làm việc cả ngày.', target: 'tired', gradable: false },
  ] }] });
  expect(a.schemaError).toBeNull(); const w = a.pack!.words[0]!;
  expect(w.cardExample.english).toContain('standing all day'); expect(w.quizExamples.map((e) => e.english)).toEqual(["I'm tired because I only slept four hours last night."]); expect(w.family).toEqual([]);
  expect(a.words[0]!.examples.map((e) => e.gradeEligible)).toEqual([false, true]); expect(a.words[0]!.publishable).toBe(true);
  expect(a.words[0]!.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['advanced_missing', 'quiz_examples_count']));
 });
 it('blocks synonyms identical to a word form', () => { const p = clone(); p.words[0]!.synonyms = ['borrowed']; expect(assessEnglishPack(p).issues.some((i) => i.code === 'synonym_self' && i.blocksGrade)).toBe(true); });
 it('requires a card example and checks quiz targets and translations', () => { const p = clone(); p.words[0]!.cardExample.english = ''; expect(assessEnglishPack(p).issues.some((i) => i.code === 'card_example' && i.blocksGrade)).toBe(true); const q = clone(); q.words[0]!.quizExamples[0]!.target = 'pen'; expect(codes(q)).toContain('word_form'); const r = clone(); r.words[0]!.quizExamples[0]!.meaningVi = 'mượn'; expect(assessEnglishPack(r).issues.some((i) => i.code === 'meaning_vi' && i.blocksGrade)).toBe(true); });
 it('never grades the card sentence or a near copy of it', () => {
  const p = clone(); p.words[0]!.quizExamples[0] = { ...p.words[0]!.cardExample, english: "Can I borrow your umbrella? It's raining and I forgot mine at home." };
  const a = assessEnglishPack(p); const w = a.words[0]!;
  expect(w.examples[0]!.gradeEligible).toBe(false); expect(w.examples[1]!.gradeEligible).toBe(false); expect(w.examples[2]!.gradeEligible).toBe(true);
  expect(w.issues.find((i) => i.code === 'example_too_similar')?.blocksGrade).toBe(false); expect(w.issues.map((i) => i.code)).toContain('quiz_examples_count'); expect(w.publishable).toBe(true);
 });
 it('flags a question that repeats an advanced example', () => { const p = clone(); p.words[0]!.quizExamples[1]!.english = 'He had to borrow money to pay the rent.'; p.words[0]!.quizExamples[1]!.target = 'borrow'; expect(codes(p)).toContain('example_too_similar'); });
 it('warns, without blocking, about thin advanced notes', () => { const p = clone(); p.words[0]!.advanced = [{ kind: 'preposition', phrase: 'borrow sth from sb', meaningVi: 'mượn cái gì của ai', example: '' }]; const a = assessEnglishPack(p); expect(a.words[0]!.issues.map((i) => i.code)).toEqual(['advanced_missing', 'advanced_example_missing']); expect(a.words[0]!.publishable).toBe(true); const q = clone(); q.words[0]!.advanced[1]!.phrase = 'take a loan'; expect(codes(q)).toEqual(['advanced_word']); });
 it('checks the word family without blocking', () => { const p = clone(); p.words[0]!.family = [{ word: 'borrowed', partOfSpeech: 'adjective', meaningVi: 'được mượn' }, { word: 'Borrower', partOfSpeech: 'Noun', meaningVi: '' }, { word: 'borrower', partOfSpeech: 'thing', meaningVi: 'x' }]; const a = assessEnglishPack(p); expect(a.pack!.words[0]!.family[1]!.partOfSpeech).toBe('noun'); expect(a.words[0]!.issues.map((i) => i.code)).toEqual(['family_self', 'family_meaning', 'family_duplicate', 'family_part_of_speech']); expect(a.words[0]!.publishable).toBe(true); });
 it('warns, without blocking, when the audio file is missing (TTS reads the word)', () => { const p = clone(); p.audioFiles = []; const a = assessEnglishPack(p); expect(a.words[0]!.issues.map((i) => i.code)).toEqual(['audio']); expect(a.words.every((w) => w.publishable)).toBe(true); });
 it('rejects unknown advanced kinds', () => { const p = clone() as unknown as { words: Array<{ advanced: unknown[] }> }; p.words[0]!.advanced = [{ kind: 'slang', phrase: 'borrow', meaningVi: 'x', example: '' }]; expect(assessEnglishPack(p).schemaError).not.toBeNull(); });
});
