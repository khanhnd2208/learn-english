import { describe, expect, it } from 'vitest';
import { parseAdvancedNotes } from '@/lib/english/advancedNotes';
import { buildAiPackPrompt } from '@/lib/english/aiPackPrompt';
describe('advanced notes', () => {
 it('drops malformed stored rows', () => { expect(parseAdvancedNotes([{ kind: 'idiom', phrase: 'keep an eye on', meaningVi: 'để mắt tới', example: '' }, { kind: 'x', phrase: 'a' }, { kind: 'idiom', phrase: ' ' }, 'bad'])).toHaveLength(1); expect(parseAdvancedNotes(null)).toEqual([]); });
 it('prompt asks for advanced phrases and keeps the word list', () => { const prompt = buildAiPackPrompt('belonging\ngive up', 'Social'); expect(prompt).toContain('advanced'); expect(prompt).toContain('cardExample'); expect(prompt).toContain('quizExamples'); expect(prompt).toContain('family'); expect(prompt).toContain('packVersion luôn là 4'); expect(prompt).toContain('give up'); expect(prompt).toContain('"Social"'); });
 it('prompt pins forms and advanced phrases to the exact studied word', () => { const prompt = buildAiPackPrompt('doctor'); expect(prompt).toContain('office worker → ["office workers"]'); expect(prompt).toContain('NGUYÊN lemma'); expect(prompt).toContain('"work freelance"'); expect(prompt).toContain('không ghi "mechanics"'); });
});
