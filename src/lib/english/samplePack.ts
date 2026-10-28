import { englishPackSchema } from '@/lib/english/contentValidation';
export const sampleEnglishPack = englishPackSchema.parse({
 title: 'Mượn và trả', description: 'Bộ mẫu để kiểm tra quy trình tiếng Anh.', packVersion: 3,
 audioFiles: ['borrow.mp3', 'lend.mp3', 'return.mp3', 'keep.mp3'],
 words: [
  { lemma: 'borrow', senseKey: 'borrow.v.take_temporarily', partOfSpeech: 'verb', ipa: '/ˈbɑːroʊ/', audioFile: 'borrow.mp3', forms: ['borrows', 'borrowed', 'borrowing'], meaningVi: 'mượn', synonyms: [], noteVi: 'Borrow là mượn về mình.', examples: [{ english: 'Can I borrow your pen?', meaningVi: 'Mình mượn bút của bạn được không?', target: 'borrow', gradable: true }] },
  { lemma: 'lend', senseKey: 'lend.v.give_temporarily', partOfSpeech: 'verb', ipa: '/lend/', audioFile: 'lend.mp3', forms: ['lends', 'lent', 'lending'], meaningVi: 'cho mượn', synonyms: [], noteVi: 'Lend là cho người khác mượn.', examples: [{ english: 'Can you lend me your pen?', meaningVi: 'Bạn có thể cho mình mượn bút không?', target: 'lend', gradable: true }] },
  { lemma: 'return', senseKey: 'return.v.give_back', partOfSpeech: 'verb', ipa: '/rɪˈtɝːn/', audioFile: 'return.mp3', forms: ['returns', 'returned', 'returning'], meaningVi: 'trả lại', synonyms: ['give back'], noteVi: '', examples: [{ english: 'Please return the book tomorrow.', meaningVi: 'Xin hãy trả lại cuốn sách vào ngày mai.', target: 'return', gradable: true }] },
  { lemma: 'keep', senseKey: 'keep.v.retain', partOfSpeech: 'verb', ipa: '/kiːp/', audioFile: 'keep.mp3', forms: ['keeps', 'kept', 'keeping'], meaningVi: 'giữ lại', synonyms: ['retain'], noteVi: '', examples: [{ english: 'You may keep the book.', meaningVi: 'Bạn có thể giữ lại cuốn sách này.', target: 'keep', gradable: true }] },
 ],
});
