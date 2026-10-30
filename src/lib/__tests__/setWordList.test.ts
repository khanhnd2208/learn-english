import { expect, it } from 'vitest';
import { filterSetWords, partOfSpeechLabel, type SetWord } from '@/lib/english/setWordList';

it('finds Vietnamese meanings without accents or case', () => {
 const words: SetWord[] = [{ senseId: 's', lemma: 'Feel', ipa: '', partOfSpeech: 'noun', meaningVi: 'cảm giác', recordedAudioAvailable: false }];
 expect(filterSetWords(words, '  CAM GIAC  ')).toEqual(words);
 expect(filterSetWords(words, 'feel')).toEqual(words);
 expect(filterSetWords(words, 'không')).toEqual([]);
});
it('uses Vietnamese part of speech labels', () => {
 expect(partOfSpeechLabel('adj.')).toBe('Tính từ');
 expect(partOfSpeechLabel('phrasal verb')).toBe('Cụm động từ');
 expect(partOfSpeechLabel('')).toBe('Chưa rõ từ loại');
});
