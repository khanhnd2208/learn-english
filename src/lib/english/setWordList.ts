export type SetWord = { senseId: string; lemma: string; ipa: string; partOfSpeech: string; meaningVi: string; recordedAudioAvailable: boolean };
export type SetWordList = { id: string; title: string; words: SetWord[] };

export function normalizeWordSearch(value: string): string {
 return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
}
export function filterSetWords(words: SetWord[], query: string): SetWord[] {
 const needle = normalizeWordSearch(query);
 return needle ? words.filter((word) => normalizeWordSearch(word.lemma).includes(needle) || normalizeWordSearch(word.meaningVi).includes(needle)) : words;
}
const PARTS: Record<string, string> = { noun: 'Danh từ', n: 'Danh từ', verb: 'Động từ', v: 'Động từ', adjective: 'Tính từ', adj: 'Tính từ', adverb: 'Trạng từ', adv: 'Trạng từ', preposition: 'Giới từ', prep: 'Giới từ', conjunction: 'Liên từ', conj: 'Liên từ', pronoun: 'Đại từ', pron: 'Đại từ', determiner: 'Từ hạn định', det: 'Từ hạn định', article: 'Mạo từ', interjection: 'Thán từ', 'phrasal verb': 'Cụm động từ', idiom: 'Thành ngữ', phrase: 'Cụm từ' };
export function partOfSpeechLabel(value: string): string { return PARTS[value.trim().toLowerCase().replace(/\.$/, '')] ?? 'Chưa rõ từ loại'; }
