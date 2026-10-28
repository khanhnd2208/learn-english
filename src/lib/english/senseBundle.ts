import { parseAdvancedNotes, type AdvancedNote } from '@/lib/english/advancedNotes';
export interface BundleExample {
 id: string; english: string; meaningVi: string; target: string;
 targetStart: number | null; targetLength: number | null;
 role: 'study' | 'grade'; sortOrder: number;
}
export interface SenseBundle {
 sense: { id: string; senseKey: string | null; meaningVi: string; partOfSpeech: string; synonyms: string[]; noteVi: string; advanced: AdvancedNote[] };
 word: { id: string; lemma: string; lemmaKey: string; partOfSpeech: string; ipa: string; audioPath: string; forms: string[] };
 examples: BundleExample[];
}
export interface SenseBundleSource {
 id: string; senseKey: string | null; meaningVi: string; partOfSpeech: string; synonyms: string[]; noteVi: string; advanced?: unknown;
 word: SenseBundle['word'];
 examples: Array<BundleExample & { status: string }>;
}
export function toSenseBundle(row: SenseBundleSource): SenseBundle {
 return {
  sense: { id: row.id, senseKey: row.senseKey, meaningVi: row.meaningVi, partOfSpeech: row.partOfSpeech, synonyms: row.synonyms, noteVi: row.noteVi, advanced: parseAdvancedNotes(row.advanced) },
  word: { ...row.word },
  examples: row.examples.filter((e) => e.status === 'published').sort((a, b) => a.sortOrder - b.sortOrder).map(({ id, english, meaningVi, target, targetStart, targetLength, role, sortOrder }) => ({ id, english, meaningVi, target, targetStart, targetLength, role, sortOrder })),
 };
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
