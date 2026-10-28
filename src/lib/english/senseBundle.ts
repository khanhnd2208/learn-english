import { parseAdvancedNotes, type AdvancedNote } from '@/lib/english/advancedNotes';
import { parseWordFamily, type FamilyMember } from '@/lib/english/wordFamily';
export interface BundleExample {
 id: string; english: string; meaningVi: string; target: string;
 targetStart: number | null; targetLength: number | null;
 role: 'study' | 'grade'; sortOrder: number;
}
export interface SenseBundle {
 sense: { id: string; senseKey: string | null; meaningVi: string; partOfSpeech: string; synonyms: string[]; noteVi: string; advanced: AdvancedNote[]; family: FamilyMember[] };
 word: { id: string; lemma: string; lemmaKey: string; partOfSpeech: string; ipa: string; audioPath: string; forms: string[] };
 examples: BundleExample[];
}
export interface SenseBundleSource {
 id: string; senseKey: string | null; meaningVi: string; partOfSpeech: string; synonyms: string[]; noteVi: string; advanced?: unknown; family?: unknown;
 word: SenseBundle['word'];
 examples: Array<BundleExample & { status: string }>;
}
export function toSenseBundle(row: SenseBundleSource): SenseBundle {
 return {
  sense: { id: row.id, senseKey: row.senseKey, meaningVi: row.meaningVi, partOfSpeech: row.partOfSpeech, synonyms: row.synonyms, noteVi: row.noteVi, advanced: parseAdvancedNotes(row.advanced), family: parseWordFamily(row.family) },
  word: { ...row.word },
  examples: row.examples.filter((e) => e.status === 'published').sort((a, b) => a.sortOrder - b.sortOrder).map(({ id, english, meaningVi, target, targetStart, targetLength, role, sortOrder }) => ({ id, english, meaningVi, target, targetStart, targetLength, role, sortOrder })),
 };
}
/**
 * The one sentence shown while studying: the first study example (older packs may only have
 * grade examples, then the first one). Quiz examples are every other grade example, so a
 * question never reuses the sentence on the card.
 */
export function cardExampleOf<T extends Pick<BundleExample, 'role' | 'sortOrder'>>(examples: T[]): T | null {
 const ordered = [...examples].sort((a, b) => a.sortOrder - b.sortOrder);
 return ordered.find((e) => e.role === 'study') ?? ordered[0] ?? null;
}
export function quizExamplesOf<T extends Pick<BundleExample, 'role' | 'sortOrder'>>(examples: T[]): T[] {
 const card = cardExampleOf(examples);
 return examples.filter((e) => e.role === 'grade' && e !== card);
}
export interface ClozeParts { before: string; answer: string; after: string }
export function clozeOf(example: { english: string; target: string; targetStart: number | null; targetLength: number | null }): ClozeParts | null {
 if (example.targetStart == null || example.targetLength == null) return null;
 const start = example.targetStart, end = start + example.targetLength;
 if (start < 0 || end > example.english.length) return null;
 const answer = example.english.slice(start, end);
 if (answer.toLowerCase() !== example.target.trim().toLowerCase()) return null;
 return { before: example.english.slice(0, start), answer, after: example.english.slice(end) };
}
export function exampleParts(example: Parameters<typeof clozeOf>[0]): ClozeParts | null {
 const cloze = clozeOf(example);
 if (cloze) return cloze;
 const match = /_{3,}/.exec(example.english);
 if (!match || !example.target.trim()) return null;
 return { before: example.english.slice(0, match.index), answer: example.target.trim(), after: example.english.slice(match.index + match[0].length) };
}
