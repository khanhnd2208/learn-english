import { describe, expect, it } from 'vitest';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { AI_PACK_PROMPT_EXAMPLE } from '@/lib/english/aiPackPrompt';
const clone = () => structuredClone(sampleEnglishPack);
describe('v3 content validation', () => {
 it('accepts the sample and prompt example', () => { for (const p of [sampleEnglishPack, AI_PACK_PROMPT_EXAMPLE]) expect(assessEnglishPack(p).issues.filter((i) => i.blocksGrade)).toEqual([]); });
 it('rejects old versions and legacy fields', () => { expect(assessEnglishPack({ ...clone(), packVersion: 2 }).schemaError).toContain('định dạng cũ'); expect(assessEnglishPack({ ...clone(), hints: [] }).schemaError).toContain('định dạng cũ'); });
 it('blocks synonyms identical to a word form', () => { const p = clone(); p.words[0]!.synonyms = ['borrowed']; expect(assessEnglishPack(p).issues.some((i) => i.code === 'synonym_self' && i.blocksGrade)).toBe(true); });
 it('checks gradable targets and translations', () => { const p = clone(); p.words[0]!.examples[0]!.target = 'pen'; expect(assessEnglishPack(p).issues.some((i) => i.code === 'word_form')).toBe(true); const q = clone(); q.words[0]!.examples[0]!.meaningVi = 'mượn'; expect(assessEnglishPack(q).issues.some((i) => i.code === 'meaning_vi' && i.blocksGrade)).toBe(true); });
 it('warns when no example is gradable and maps eligibility', () => { const p = clone(); p.words[0]!.examples[0]!.gradable = false; const a = assessEnglishPack(p); expect(a.words[0]!.examples[0]!.gradeEligible).toBe(false); expect(a.words[0]!.issues.some((i) => i.code === 'no_grade_example' && !i.blocksGrade)).toBe(true); expect(a.words[0]!.publishable).toBe(true); });
 it('accepts advanced notes and warns, without blocking, when a phrase lacks the word', () => { const p = clone(); p.words[0]!.advanced = [{ kind: 'preposition', phrase: 'borrow sth from sb', meaningVi: 'mượn cái gì từ ai', example: 'I borrowed a pen from Lan.' }, { kind: 'collocation', phrase: 'take a loan', meaningVi: 'vay tiền', example: '' }]; const a = assessEnglishPack(p); expect(a.pack!.words[0]!.advanced).toHaveLength(2); const codes = a.words[0]!.issues.map((i) => i.code); expect(codes).toEqual(['advanced_word']); expect(a.words[0]!.publishable).toBe(true); });
 it('rejects unknown advanced kinds', () => { const p = clone() as unknown as { words: Array<{ advanced: unknown[] }> }; p.words[0]!.advanced = [{ kind: 'slang', phrase: 'borrow', meaningVi: 'x', example: '' }]; expect(assessEnglishPack(p).schemaError).not.toBeNull(); });
});
