import { describe, expect, it } from 'vitest';
import { assessEnglishPack, normalizeSenseKey } from '@/lib/english/contentValidation';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { AI_PACK_PROMPT_EXAMPLE, buildAiPackPrompt, buildAiRepairPrompt } from '@/lib/english/aiPackPrompt';
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
 it('finds the word in possessive and hyphenated phrases but not in a root or part of a compound', () => {
  const advancedCodes = (lemma: string, forms: string[], phrase: string, example: string) => { const p = clone(); Object.assign(p.words[0]!, { lemma, forms }); p.words[0]!.advanced[1] = { kind: 'collocation', phrase, meaningVi: 'x', example }; return assessEnglishPack(p).issues.filter((i) => i.path.endsWith('.advanced.1')).map((i) => i.code); };
  expect(advancedCodes('doctor', ['doctors'], "a doctor's note", "I brought a doctor's note to school.")).toEqual([]);
  expect(advancedCodes('doctor', ['doctors'], 'a doctor’s appointment', 'Both doctors’ phones rang at once.')).toEqual([]);
  expect(advancedCodes('driver', ['drivers'], 'a taxi-driver', 'He worked as a taxi-driver for ten years.')).toEqual([]);
  expect(advancedCodes('office worker', ['office workers'], 'office workers', 'Office workers crowd the café at noon.')).toEqual([]);
  expect(advancedCodes('freelancer', ['freelancers'], 'work freelance', 'She works freelance from home.')).toEqual(['advanced_word', 'advanced_example']);
  expect(advancedCodes('office worker', [], 'office staff', 'The office staff left early on Friday.')).toEqual(['advanced_word', 'advanced_example']);
 });
 it('checks the word family without blocking', () => { const p = clone(); p.words[0]!.family = [{ word: 'borrowed', partOfSpeech: 'adjective', meaningVi: 'được mượn' }, { word: 'Borrower', partOfSpeech: 'Noun', meaningVi: '' }, { word: 'borrower', partOfSpeech: 'thing', meaningVi: 'x' }]; const a = assessEnglishPack(p); expect(a.pack!.words[0]!.family[1]!.partOfSpeech).toBe('noun'); expect(a.words[0]!.issues.map((i) => i.code)).toEqual(['family_self', 'family_meaning', 'family_duplicate', 'family_part_of_speech']); expect(a.words[0]!.publishable).toBe(true); });
 it('warns, without blocking, when the audio file is missing (TTS reads the word)', () => { const p = clone(); p.audioFiles = []; const a = assessEnglishPack(p); expect(a.words[0]!.issues.map((i) => i.code)).toEqual(['audio']); expect(a.words.every((w) => w.publishable)).toBe(true); });
 it('rejects unknown advanced kinds', () => { const p = clone() as unknown as { words: Array<{ advanced: unknown[] }> }; p.words[0]!.advanced = [{ kind: 'slang', phrase: 'borrow', meaningVi: 'x', example: '' }]; expect(assessEnglishPack(p).schemaError).not.toBeNull(); });
 it('accepts accented and capitalised lemmas: café and IT worker publish', () => {
  const cafe = { lemma: 'café', senseKey: 'café.n.coffee_shop', partOfSpeech: 'noun', ipa: '/kæˈfeɪ/', audioFile: 'cafe.mp3', forms: ['cafés', 'cafes'], meaningVi: 'quán cà phê', synonyms: ['coffee shop'], noteVi: '', family: [{ word: 'cafeteria', partOfSpeech: 'noun', meaningVi: 'nhà ăn tự phục vụ' }],
   cardExample: { english: 'My friends and I often meet at a small café near our university.', meaningVi: 'Tôi và các bạn thường gặp nhau ở một quán cà phê nhỏ gần trường.', target: 'café' },
   quizExamples: [{ english: 'Several cafés in the old town have outdoor tables for visitors.', meaningVi: 'Một số quán cà phê trong phố cổ có bàn ngoài trời cho du khách.', target: 'cafés' }, { english: 'She opened a cafe on a quiet street and serves fresh coffee every morning.', meaningVi: 'Cô ấy mở một quán cà phê trên phố yên tĩnh và pha cà phê mỗi sáng.', target: 'cafe' }],
   advanced: [{ kind: 'collocation' as const, phrase: 'a sidewalk café', meaningVi: 'quán cà phê vỉa hè', example: 'We sat at a sidewalk café and watched people pass.' }, { kind: 'collocation' as const, phrase: 'a café terrace', meaningVi: 'khu ngồi ngoài trời quán cà phê', example: 'We had breakfast on the cafe terrace by the river.' }] };
  const it = { ...structuredClone(cafe), lemma: 'IT worker', senseKey: 'IT Worker .N. it_employee', forms: ['IT workers'], audioFile: 'it-worker.mp3', synonyms: [], family: [],
   cardExample: { english: 'My brother is an IT worker who fixes computer problems at his office.', meaningVi: 'Anh tôi là nhân viên IT, chuyên sửa lỗi máy tính ở văn phòng.', target: 'IT worker' },
   quizExamples: [{ english: 'The company hired more IT workers to protect its customer data.', meaningVi: 'Công ty tuyển thêm nhân viên IT để bảo vệ dữ liệu khách hàng.', target: 'IT workers' }, { english: 'We called an IT worker when nobody could connect to the internet.', meaningVi: 'Chúng tôi gọi nhân viên IT khi không ai kết nối được internet.', target: 'IT worker' }],
   advanced: [{ kind: 'pattern' as const, phrase: 'work as an IT worker', meaningVi: 'làm nhân viên IT', example: 'He plans to work as an IT worker after graduation.' }, { kind: 'collocation' as const, phrase: 'a skilled IT worker', meaningVi: 'nhân viên IT giỏi', example: 'A skilled IT worker solved the problem in minutes.' }] };
  const a = assessEnglishPack({ title: 'Nghề nghiệp', description: '', packVersion: 4, audioFiles: ['cafe.mp3', 'it-worker.mp3'], words: [cafe, it] });
  expect(a.issues).toEqual([]);
  expect(a.pack!.words[1]!.senseKey).toBe('it worker.n.it_employee');
 });
 it('normalises senseKeys and rejects broken ones with the offending key', () => {
  expect(normalizeSenseKey(' Café .N. coffee_shop ')).toBe('café.n.coffee_shop');
  expect(normalizeSenseKey('doctor’s note.n.sick_note')).toBe("doctor's note.n.sick_note");
  const p = clone(); p.words[0]!.senseKey = 'borrow.verb.take temporarily';
  expect(assessEnglishPack(p).issues.find((i) => i.code === 'sense_key')?.message).toContain('"borrow.verb.take temporarily"');
  const q = clone(); q.words[0]!.senseKey = 'lend.v.take_temporarily';
  expect(assessEnglishPack(q).issues.map((i) => [i.code, i.blocksGrade])).toEqual([['sense_key_lemma', false]]);
 });
 it('drops a synonym that is another word of the same pack and says so', () => {
  const p = clone(); p.words[0]!.synonyms = ['take', 'Lent'];
  const a = assessEnglishPack(p);
  expect(a.pack!.words[0]!.synonyms).toEqual(['take']);
  expect(a.words[0]!.issues.map((i) => [i.code, i.message, i.blocksGrade])).toEqual([['synonym_in_pack', 'Đã bỏ từ đồng nghĩa "Lent" vì đó là một từ khác trong bộ.', false]]);
  expect(a.words[0]!.publishable).toBe(true);
 });
 it('repair prompt lists only what the AI can fix, once each', () => {
  const issues = [{ path: 'words.café', code: 'sense_key', message: 'senseKey sai.' }, { path: 'words.café', code: 'sense_key', message: 'senseKey sai.' }, { path: 'words.bank', code: 'audio', message: 'Chưa có file audio.' }, { path: 'words.shop', code: 'synonym_in_pack', message: 'Đã bỏ.' }];
  const prompt = buildAiRepairPrompt(issues);
  expect(prompt).toContain('thấy 1 lỗi:\n- words.café: senseKey sai.\n');
  expect(prompt).toContain('TOÀN BỘ gói JSON');
  expect(prompt).not.toContain('words.bank');
  expect(buildAiRepairPrompt(issues.slice(2))).toBe('');
 });
 it('prompt spells out accented senseKeys, ASCII audio names and synonym limits', () => {
  const prompt = buildAiPackPrompt('café');
  expect(prompt).toContain('"café.n.coffee_shop"');
  expect(prompt).toContain('"cafe.mp3"');
  expect(prompt).toContain('không ghi clinic cho hospital');
 });
});
