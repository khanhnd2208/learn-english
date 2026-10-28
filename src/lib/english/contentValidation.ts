import { z } from 'zod';
import { EN_MAX_EXAMPLES_PER_WORD, EN_MAX_WORDS_PER_PACK, EN_MAX_SYNONYMS } from '@/lib/english/constants';
import { advancedNoteSchema, EN_MAX_ADVANCED } from '@/lib/english/advancedNotes';
import { blankReport, isFullVietnameseMeaning, lemmaKeyOf, locateTarget, uniqueTexts } from '@/lib/english/text';

const exampleSchema = z.object({ english: z.string().default(''), meaningVi: z.string().default(''), target: z.string().default(''), targetStart: z.number().int().nonnegative().nullable().default(null), targetLength: z.number().int().nonnegative().nullable().default(null), gradable: z.boolean().default(false) }).strict();
const wordSchema = z.object({ lemma: z.string().default(''), senseKey: z.string().default(''), partOfSpeech: z.string().default(''), ipa: z.string().default(''), audioFile: z.string().default(''), forms: z.array(z.string()).default([]), meaningVi: z.string().default(''), synonyms: z.array(z.string()).default([]), noteVi: z.string().default(''), advanced: z.array(advancedNoteSchema).default([]), examples: z.array(exampleSchema).max(EN_MAX_EXAMPLES_PER_WORD).default([]) }).strict();
export const englishPackSchema = z.object({ title: z.string().default(''), description: z.string().default(''), packVersion: z.literal(3), audioFiles: z.array(z.string()).default([]), words: z.array(wordSchema).max(EN_MAX_WORDS_PER_PACK).default([]) }).strict();
export type EnglishPack = z.infer<typeof englishPackSchema>;
export type PackWord = EnglishPack['words'][number];
export type PackExample = PackWord['examples'][number];
export interface ContentIssue { path: string; code: string; message: string; blocksGrade: boolean }
export interface AssessedExample { index: number; gradeEligible: boolean; issues: ContentIssue[] }
export interface AssessedWord { index: number; publishable: boolean; gradeExampleCount: number; examples: AssessedExample[]; issues: ContentIssue[] }
export interface AssessedPack { schemaError: string | null; pack: EnglishPack | null; issues: ContentIssue[]; words: AssessedWord[] }
/** True when any word of the text (or a multi-word form) is the lemma or one of its forms. */
function containsForm(text: string, forms: Set<string>): boolean {
 const lower = ` ${lemmaKeyOf(text).replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ')} `;
 return [...forms].some((f) => f && lower.includes(` ${f} `));
}
const issue = (path: string, code: string, message: string, blocksGrade = true): ContentIssue => ({ path, code, message, blocksGrade });
export function normalizeEnglishPack(pack: EnglishPack): EnglishPack {
 return { ...pack, title: pack.title.trim(), description: pack.description.trim(), audioFiles: uniqueTexts(pack.audioFiles), words: pack.words.map((w) => ({ ...w, lemma: w.lemma.trim(), senseKey: w.senseKey.trim(), partOfSpeech: w.partOfSpeech.trim(), ipa: w.ipa.trim(), audioFile: w.audioFile.trim(), meaningVi: w.meaningVi.trim(), noteVi: w.noteVi.trim(), advanced: w.advanced.map((a) => ({ kind: a.kind, phrase: a.phrase.trim().replace(/\s+/g, ' '), meaningVi: a.meaningVi.trim(), example: a.example.trim() })).filter((a) => a.phrase), forms: uniqueTexts(w.forms), synonyms: uniqueTexts(w.synonyms).filter((s) => lemmaKeyOf(s) !== lemmaKeyOf(w.lemma)), examples: w.examples.map((e) => { const english = e.english.trim(), target = e.target.trim(); const found = locateTarget(english, target); const targetStart = e.targetStart ?? (typeof found === 'object' ? found.start : null); return { ...e, english, target, meaningVi: e.meaningVi.trim(), targetStart, targetLength: targetStart === null ? null : (e.targetLength ?? target.length) }; }) })) };
}
export function assessEnglishPack(input: unknown): AssessedPack {
 const parsed = englishPackSchema.safeParse(input);
 if (!parsed.success) return { schemaError: 'Pack định dạng cũ. Hãy tạo lại theo prompt v3.', pack: null, issues: [], words: [] };
 const raw = parsed.data;
 const pack = normalizeEnglishPack(raw);
 const seen = new Set<string>();
 const words = pack.words.map((w, index): AssessedWord => {
  const path = `words.${w.lemma || index}`, issues: ContentIssue[] = [];
  if (!w.lemma) issues.push(issue(path, 'lemma', 'Thiếu từ tiếng Anh.'));
  if (!/^[a-z0-9' -]+\.[a-z]+\.[a-z0-9_]+$/.test(w.senseKey)) issues.push(issue(path, 'sense_key', 'senseKey không đúng định dạng.'));
  if (seen.has(w.senseKey)) issues.push(issue(path, 'duplicate_sense_key', 'senseKey bị trùng.'));
  seen.add(w.senseKey);
  if (!w.partOfSpeech) issues.push(issue(path, 'part_of_speech', 'Thiếu loại từ.'));
  if (!w.meaningVi) issues.push(issue(path, 'meaning_vi', 'Thiếu nghĩa tiếng Việt.'));
  if (!/^\/[^/\n]+\/$/.test(w.ipa)) issues.push(issue(path, 'ipa', 'IPA cần nằm trong dấu / /.'));
  if (!w.audioFile || !pack.audioFiles.includes(w.audioFile)) issues.push(issue(path, 'audio', 'Audio không có trong danh sách.'));
  const forms = new Set([w.lemma, ...w.forms].map(lemmaKeyOf));
  if (raw.words[index].synonyms.some((s) => forms.has(lemmaKeyOf(s)))) issues.push(issue(path, 'synonym_self', 'Từ đồng nghĩa trùng từ hoặc dạng của từ.'));
  if (w.synonyms.length > EN_MAX_SYNONYMS) issues.push(issue(path, 'synonym_count', 'Quá nhiều từ đồng nghĩa.'));
  if (w.noteVi.length > 200) issues.push(issue(path, 'note_too_long', 'Lưu ý dài hơn 200 ký tự.', false));
  if (w.advanced.length > EN_MAX_ADVANCED) issues.push(issue(path, 'advanced_count', `Phần nâng cao tối đa ${EN_MAX_ADVANCED} cụm.`, false));
  const phrases = new Set<string>();
  w.advanced.forEach((a, i) => {
   const p = `${path}.advanced.${i}`, key = lemmaKeyOf(a.phrase);
   if (phrases.has(key)) issues.push(issue(p, 'advanced_duplicate', 'Cụm nâng cao bị trùng.', false));
   phrases.add(key);
   if (!containsForm(a.phrase, forms)) issues.push(issue(p, 'advanced_word', 'Cụm nâng cao phải chứa từ đang học hoặc dạng của nó.', false));
   if (!a.meaningVi) issues.push(issue(p, 'advanced_meaning', 'Cụm nâng cao thiếu nghĩa tiếng Việt.', false));
   if (a.example && !containsForm(a.example, forms)) issues.push(issue(p, 'advanced_example', 'Ví dụ nâng cao không chứa từ đang học.', false));
  });
  if (w.examples.length < 1) issues.push(issue(path, 'examples_count', 'Cần ít nhất một câu ví dụ.'));
  const examples = w.examples.map((e, i): AssessedExample => {
   const p = `${path}.examples.${i}`, problems: ContentIssue[] = [];
   if (e.english.includes('___')) { if (!blankReport(e.english, e.target).ok) problems.push(issue(p, 'target_ambiguous', 'Chỗ trống không hợp lệ.')); }
   else if (e.targetStart === null) problems.push(issue(p, 'target_ambiguous', 'Không xác định được vị trí từ đích.'));
   else if (e.english.slice(e.targetStart, e.targetStart + (e.targetLength ?? 0)).toLowerCase() !== e.target.toLowerCase()) problems.push(issue(p, 'target_offset_mismatch', 'Vị trí từ đích không khớp.'));
   if (!forms.has(lemmaKeyOf(e.target))) problems.push(issue(p, 'word_form', 'Từ đích không phải dạng của từ đang học.'));
   if (e.gradable && !isFullVietnameseMeaning(e.meaningVi, w.meaningVi)) problems.push(issue(p, 'meaning_vi', 'Câu dùng để chấm cần bản dịch đầy đủ.'));
   return { index: i, gradeEligible: e.gradable && problems.length === 0, issues: problems };
  });
  const count = examples.filter((e) => e.gradeEligible).length;
  if (!count) issues.push(issue(path, 'no_grade_example', 'Không có câu dùng để chấm.', false));
  const all = [...issues, ...examples.flatMap((e) => e.issues)];
  return { index, publishable: !all.some((i) => i.blocksGrade), gradeExampleCount: count, examples, issues: all };
 });
 const issues = [...(!pack.title ? [issue('title', 'title', 'Thiếu tên bộ học.')] : []), ...words.flatMap((w) => w.issues)];
 return { schemaError: null, pack, issues, words };
}
