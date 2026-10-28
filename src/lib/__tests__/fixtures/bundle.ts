import type { SenseBundle } from '@/lib/english/senseBundle';
export function bundle(i: number): SenseBundle {
 const lemma = `word${i}`;
 return { sense: { id: `s${i}`, senseKey: null, meaningVi: `nghĩa ${i}`, partOfSpeech: 'noun', synonyms: [], noteVi: '', advanced: [], family: [] }, word: { id: `w${i}`, lemma, lemmaKey: lemma, partOfSpeech: 'noun', ipa: '/word/', audioPath: 'word.mp3', forms: [] }, examples: [{ id: `e${i}`, english: `Use ${lemma} here.`, meaningVi: `Dùng từ số ${i} ở đây.`, target: lemma, targetStart: 4, targetLength: lemma.length, role: 'study', sortOrder: 0 }, { id: `q${i}`, english: `We need ${lemma} today.`, meaningVi: `Hôm nay chúng tôi cần từ số ${i}.`, target: lemma, targetStart: 8, targetLength: lemma.length, role: 'grade', sortOrder: 1 }] };
}
