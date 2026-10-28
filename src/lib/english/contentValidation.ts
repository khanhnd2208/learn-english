import { z } from 'zod';
import { EN_MAX_EXAMPLES_PER_WORD, EN_MAX_WORDS_PER_PACK, EN_MAX_SYNONYMS, EN_QUIZ_EXAMPLES_MIN } from '@/lib/english/constants';
import { advancedNoteSchema, EN_MAX_ADVANCED, EN_MIN_ADVANCED } from '@/lib/english/advancedNotes';
import { EN_FAMILY_PARTS_OF_SPEECH, EN_MAX_FAMILY, familyMemberSchema } from '@/lib/english/wordFamily';
import { blankReport, isFullVietnameseMeaning, lemmaKeyOf, locateTarget, uniqueTexts } from '@/lib/english/text';

/**
 * Pack v4: each sense has one card example (shown while studying) and hidden quiz examples
 * (only used as fill-in questions), so a question never repeats the sentence the learner read.
 */
const exampleFields = { english: z.string().default(''), meaningVi: z.string().default(''), target: z.string().default(''), targetStart: z.number().int().nonnegative().nullable().default(null), targetLength: z.number().int().nonnegative().nullable().default(null) };
const exampleSchema = z.object(exampleFields).strict();
const senseFields = { lemma: z.string().default(''), senseKey: z.string().default(''), partOfSpeech: z.string().default(''), ipa: z.string().default(''), audioFile: z.string().default(''), forms: z.array(z.string()).default([]), meaningVi: z.string().default(''), synonyms: z.array(z.string()).default([]), noteVi: z.string().default(''), advanced: z.array(advancedNoteSchema).default([]) };
const wordSchema = z.object({ ...senseFields, family: z.array(familyMemberSchema).default([]), cardExample: exampleSchema.prefault({}), quizExamples: z.array(exampleSchema).max(EN_MAX_EXAMPLES_PER_WORD - 1).default([]) }).strict();
const packFields = { title: z.string().default(''), description: z.string().default(''), audioFiles: z.array(z.string()).default([]) };
export const englishPackSchema = z.object({ ...packFields, packVersion: z.literal(4), words: z.array(wordSchema).max(EN_MAX_WORDS_PER_PACK).default([]) }).strict();
/** v3 packs mixed shown and graded sentences in one list; they are upgraded on import. */
const legacyPackSchema = z.object({ ...packFields, packVersion: z.literal(3), words: z.array(z.object({ ...senseFields, examples: z.array(z.object({ ...exampleFields, gradable: z.boolean().default(false) }).strict()).max(EN_MAX_EXAMPLES_PER_WORD).default([]) }).strict()).max(EN_MAX_WORDS_PER_PACK).default([]) }).strict();
export type EnglishPack = z.infer<typeof englishPackSchema>;
export type PackWord = EnglishPack['words'][number];
export type PackExample = PackWord['cardExample'];
export interface ContentIssue { path: string; code: string; message: string; blocksGrade: boolean }
/** examples[0] is the card example; the rest are the quiz examples in order. */
export interface AssessedExample { index: number; gradeEligible: boolean; issues: ContentIssue[] }
export interface AssessedWord { index: number; publishable: boolean; gradeExampleCount: number; examples: AssessedExample[]; issues: ContentIssue[] }
export interface AssessedPack { schemaError: string | null; pack: EnglishPack | null; issues: ContentIssue[]; words: AssessedWord[] }
/** Card example first, then quiz examples — the order used for storage and assessment. */
export const examplesOf = (word: PackWord): PackExample[] => [word.cardExample, ...word.quizExamples];
const SIMILAR_RATIO = 0.6;

function fromLegacy(pack: z.infer<typeof legacyPackSchema>): EnglishPack {
 const strip = (e: z.infer<typeof legacyPackSchema>['words'][number]['examples'][number]): PackExample => ({ english: e.english, meaningVi: e.meaningVi, target: e.target, targetStart: e.targetStart, targetLength: e.targetLength });
 return { ...pack, packVersion: 4, words: pack.words.map(({ examples, ...word }) => {
  const card = examples.find((e) => !e.gradable) ?? examples[0];
  return { ...word, family: [], cardExample: card ? strip(card) : { english: '', meaningVi: '', target: '', targetStart: null, targetLength: null }, quizExamples: examples.filter((e) => e !== card && e.gradable).map(strip) };
 }) };
}
function parsePack(input: unknown): { pack: EnglishPack | null; error: string | null } {
 const current = englishPackSchema.safeParse(input);
 if (current.success) return { pack: current.data, error: null };
 const legacy = legacyPackSchema.safeParse(input);
 if (legacy.success) return { pack: fromLegacy(legacy.data), error: null };
 const version = (input as { packVersion?: unknown } | null)?.packVersion;
 if (version !== 4) return { pack: null, error: 'Pack định dạng cũ. Hãy tạo lại theo prompt v4.' };
 const first = current.error.issues[0];
 return { pack: null, error: `JSON sai cấu trúc ở ${first?.path.join('.') || 'gốc'}: ${first?.message ?? 'không hợp lệ'}.` };
}
/** True when any word of the text (or a multi-word form) is the lemma or one of its forms. */
function containsForm(text: string, forms: Set<string>): boolean {
 const lower = ` ${lemmaKeyOf(text).replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ')} `;
 return [...forms].some((f) => f && lower.includes(` ${f} `));
}
/** Share of content words two sentences have in common, ignoring the studied word itself. */
function overlap(a: string, b: string, forms: Set<string>): number {
 const words = (text: string) => new Set(lemmaKeyOf(text).replace(/[^a-z0-9' ]+/g, ' ').split(' ').filter((w) => w && !forms.has(w)));
 const x = words(a), y = words(b);
 if (!x.size || !y.size) return lemmaKeyOf(a) === lemmaKeyOf(b) ? 1 : 0;
 const shared = [...x].filter((w) => y.has(w)).length;
 return shared / new Set([...x, ...y]).size;
}
const issue = (path: string, code: string, message: string, blocksGrade = true): ContentIssue => ({ path, code, message, blocksGrade });
function normalizeExample(e: PackExample): PackExample {
 const english = e.english.trim(), target = e.target.trim();
 const found = locateTarget(english, target);
 const targetStart = e.targetStart ?? (typeof found === 'object' ? found.start : null);
 return { ...e, english, target, meaningVi: e.meaningVi.trim(), targetStart, targetLength: targetStart === null ? null : (e.targetLength ?? target.length) };
}
export function normalizeEnglishPack(pack: EnglishPack): EnglishPack {
 return { ...pack, title: pack.title.trim(), description: pack.description.trim(), audioFiles: uniqueTexts(pack.audioFiles), words: pack.words.map((w) => ({ ...w, lemma: w.lemma.trim(), senseKey: w.senseKey.trim(), partOfSpeech: w.partOfSpeech.trim(), ipa: w.ipa.trim(), audioFile: w.audioFile.trim(), meaningVi: w.meaningVi.trim(), noteVi: w.noteVi.trim(), advanced: w.advanced.map((a) => ({ kind: a.kind, phrase: a.phrase.trim().replace(/\s+/g, ' '), meaningVi: a.meaningVi.trim(), example: a.example.trim() })).filter((a) => a.phrase), family: w.family.map((f) => ({ word: f.word.trim().replace(/\s+/g, ' '), partOfSpeech: f.partOfSpeech.trim().toLowerCase(), meaningVi: f.meaningVi.trim() })).filter((f) => f.word), forms: uniqueTexts(w.forms), synonyms: uniqueTexts(w.synonyms).filter((s) => lemmaKeyOf(s) !== lemmaKeyOf(w.lemma)), cardExample: normalizeExample(w.cardExample), quizExamples: w.quizExamples.map(normalizeExample).filter((e) => e.english) })) };
}
export function assessEnglishPack(input: unknown): AssessedPack {
 const parsed = parsePack(input);
 if (!parsed.pack) return { schemaError: parsed.error, pack: null, issues: [], words: [] };
 const raw = parsed.pack;
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
  if (!w.audioFile || !pack.audioFiles.includes(w.audioFile)) issues.push(issue(path, 'audio', 'Chưa có file audio; sẽ đọc bằng giọng máy (TTS).', false));
  const forms = new Set([w.lemma, ...w.forms].map(lemmaKeyOf));
  if (raw.words[index].synonyms.some((s) => forms.has(lemmaKeyOf(s)))) issues.push(issue(path, 'synonym_self', 'Từ đồng nghĩa trùng từ hoặc dạng của từ.'));
  if (w.synonyms.length > EN_MAX_SYNONYMS) issues.push(issue(path, 'synonym_count', 'Quá nhiều từ đồng nghĩa.'));
  if (w.noteVi.length > 200) issues.push(issue(path, 'note_too_long', 'Lưu ý dài hơn 200 ký tự.', false));
  if (w.advanced.length < EN_MIN_ADVANCED) issues.push(issue(path, 'advanced_missing', `Phần nâng cao cần ít nhất ${EN_MIN_ADVANCED} cụm.`, false));
  if (w.advanced.length > EN_MAX_ADVANCED) issues.push(issue(path, 'advanced_count', `Phần nâng cao tối đa ${EN_MAX_ADVANCED} cụm.`, false));
  const phrases = new Set<string>();
  w.advanced.forEach((a, i) => {
   const p = `${path}.advanced.${i}`, key = lemmaKeyOf(a.phrase);
   if (phrases.has(key)) issues.push(issue(p, 'advanced_duplicate', 'Cụm nâng cao bị trùng.', false));
   phrases.add(key);
   if (!containsForm(a.phrase, forms)) issues.push(issue(p, 'advanced_word', 'Cụm nâng cao phải chứa từ đang học hoặc dạng của nó.', false));
   if (!a.meaningVi) issues.push(issue(p, 'advanced_meaning', 'Cụm nâng cao thiếu nghĩa tiếng Việt.', false));
   if (!a.example) issues.push(issue(p, 'advanced_example_missing', 'Cụm nâng cao thiếu câu ví dụ.', false));
   else if (!containsForm(a.example, forms)) issues.push(issue(p, 'advanced_example', 'Ví dụ nâng cao không chứa từ đang học.', false));
  });
  if (w.family.length > EN_MAX_FAMILY) issues.push(issue(path, 'family_count', `Họ từ tối đa ${EN_MAX_FAMILY} từ.`, false));
  const members = new Set<string>();
  w.family.forEach((f, i) => {
   const p = `${path}.family.${i}`, key = lemmaKeyOf(f.word);
   if (forms.has(key)) issues.push(issue(p, 'family_self', 'Từ cùng họ trùng từ đang học hoặc dạng biến đổi của nó.', false));
   if (members.has(key)) issues.push(issue(p, 'family_duplicate', 'Từ cùng họ bị trùng.', false));
   members.add(key);
   if (!(EN_FAMILY_PARTS_OF_SPEECH as readonly string[]).includes(f.partOfSpeech)) issues.push(issue(p, 'family_part_of_speech', `Loại từ của từ cùng họ phải là: ${EN_FAMILY_PARTS_OF_SPEECH.join(', ')}.`, false));
   if (!f.meaningVi) issues.push(issue(p, 'family_meaning', 'Từ cùng họ thiếu nghĩa tiếng Việt.', false));
  });
  if (!w.cardExample.english) issues.push(issue(path, 'card_example', 'Thiếu câu ví dụ hiển thị trên thẻ.'));
  const visible = [w.cardExample.english, ...w.advanced.map((a) => a.example)].filter(Boolean);
  const examples = examplesOf(w).map((e, i): AssessedExample => {
   const quiz = i > 0, p = quiz ? `${path}.quizExamples.${i - 1}` : `${path}.cardExample`, problems: ContentIssue[] = [];
   if (!e.english) return { index: i, gradeEligible: false, issues: [] };
   if (e.english.includes('___')) { if (!blankReport(e.english, e.target).ok) problems.push(issue(p, 'target_ambiguous', 'Chỗ trống không hợp lệ.')); }
   else if (e.targetStart === null) problems.push(issue(p, 'target_ambiguous', 'Không xác định được vị trí từ đích.'));
   else if (e.english.slice(e.targetStart, e.targetStart + (e.targetLength ?? 0)).toLowerCase() !== e.target.toLowerCase()) problems.push(issue(p, 'target_offset_mismatch', 'Vị trí từ đích không khớp.'));
   if (!forms.has(lemmaKeyOf(e.target))) problems.push(issue(p, 'word_form', 'Từ đích không phải dạng của từ đang học.'));
   if (!quiz && !e.meaningVi) problems.push(issue(p, 'meaning_vi', 'Câu trên thẻ thiếu bản dịch.', false));
   if (quiz && !isFullVietnameseMeaning(e.meaningVi, w.meaningVi)) problems.push(issue(p, 'meaning_vi', 'Câu hỏi cần bản dịch đầy đủ.'));
   const earlier = [...visible, ...w.quizExamples.slice(0, Math.max(0, i - 1)).map((q) => q.english)];
   if (quiz && earlier.some((text) => overlap(text, e.english, forms) >= SIMILAR_RATIO)) problems.push(issue(p, 'example_too_similar', 'Câu hỏi gần giống câu đã hiện trên thẻ hoặc câu hỏi khác; người học sẽ nhớ thuộc thay vì hiểu.', false));
   return { index: i, gradeEligible: quiz && problems.length === 0, issues: problems };
  });
  const count = examples.filter((e) => e.gradeEligible).length;
  if (!count) issues.push(issue(path, 'no_grade_example', 'Không có câu hỏi ẩn dùng để chấm.', false));
  else if (count < EN_QUIZ_EXAMPLES_MIN) issues.push(issue(path, 'quiz_examples_count', `Nên có ít nhất ${EN_QUIZ_EXAMPLES_MIN} câu hỏi ẩn (hiện có ${count}).`, false));
  const all = [...issues, ...examples.flatMap((e) => e.issues)];
  return { index, publishable: !all.some((i) => i.blocksGrade), gradeExampleCount: count, examples, issues: all };
 });
 const issues = [...(!pack.title ? [issue('title', 'title', 'Thiếu tên bộ học.')] : []), ...words.flatMap((w) => w.issues)];
 return { schemaError: null, pack, issues, words };
}
