import { englishPackSchema } from '@/lib/english/contentValidation';
export const sampleEnglishPack = englishPackSchema.parse({
 title: 'Mượn và trả', description: 'Bộ mẫu để kiểm tra quy trình tiếng Anh.', packVersion: 4,
 audioFiles: ['borrow.mp3', 'lend.mp3', 'return.mp3', 'keep.mp3'],
 words: [
  { lemma: 'borrow', senseKey: 'borrow.v.take_temporarily', partOfSpeech: 'verb', ipa: '/ˈbɑːroʊ/', audioFile: 'borrow.mp3', forms: ['borrows', 'borrowed', 'borrowing'], meaningVi: 'mượn', synonyms: [], noteVi: 'Borrow là mượn về mình.',
   family: [{ word: 'borrower', partOfSpeech: 'noun', meaningVi: 'người đi mượn' }],
   cardExample: { english: "Can I borrow your umbrella? It's raining and I left mine at home.", meaningVi: 'Mình mượn ô của bạn được không? Trời đang mưa mà mình để quên ô ở nhà.', target: 'borrow' },
   quizExamples: [
    { english: 'She borrowed three books from the library for her history project.', meaningVi: 'Cô ấy mượn ba cuốn sách ở thư viện cho dự án môn lịch sử.', target: 'borrowed' },
    { english: "We didn't have enough chairs, so we borrowed some from our neighbours.", meaningVi: 'Chúng tôi không đủ ghế nên đã mượn vài cái của hàng xóm.', target: 'borrowed' },
   ],
   advanced: [
    { kind: 'preposition', phrase: 'borrow sth from sb', meaningVi: 'mượn cái gì của ai', example: 'I borrowed a pen from my classmate during the test.' },
    { kind: 'collocation', phrase: 'borrow money', meaningVi: 'vay tiền', example: 'He had to borrow money to pay the rent.' },
   ] },
  { lemma: 'lend', senseKey: 'lend.v.give_temporarily', partOfSpeech: 'verb', ipa: '/ˈlend/', audioFile: 'lend.mp3', forms: ['lends', 'lent', 'lending'], meaningVi: 'cho mượn', synonyms: ['loan'], noteVi: 'Lend là cho người khác mượn.',
   family: [{ word: 'lender', partOfSpeech: 'noun', meaningVi: 'người cho vay' }],
   cardExample: { english: 'My brother lent me his bike because mine had a flat tyre.', meaningVi: 'Anh trai cho tôi mượn xe đạp vì xe tôi bị xịt lốp.', target: 'lent' },
   quizExamples: [
    { english: 'Banks lend money to people who want to buy a house.', meaningVi: 'Ngân hàng cho những người muốn mua nhà vay tiền.', target: 'lend' },
    { english: 'I never lend my notes to classmates who skip lessons.', meaningVi: 'Tôi không bao giờ cho những bạn trốn học mượn vở ghi.', target: 'lend' },
   ],
   advanced: [
    { kind: 'pattern', phrase: 'lend sb sth', meaningVi: 'cho ai mượn cái gì', example: 'Could you lend me your charger for an hour?' },
    { kind: 'idiom', phrase: 'lend a hand', meaningVi: 'giúp một tay', example: 'Can you lend a hand with these heavy boxes?' },
   ] },
  { lemma: 'return', senseKey: 'return.v.give_back', partOfSpeech: 'verb', ipa: '/rɪˈtɝːn/', audioFile: 'return.mp3', forms: ['returns', 'returned', 'returning'], meaningVi: 'trả lại', synonyms: ['give back'], noteVi: '',
   family: [{ word: 'returnable', partOfSpeech: 'adjective', meaningVi: 'có thể trả lại' }],
   cardExample: { english: "Please return the book to the library before Friday, or you'll pay a fine.", meaningVi: 'Hãy trả sách cho thư viện trước thứ Sáu, nếu không bạn sẽ bị phạt.', target: 'return' },
   quizExamples: [
    { english: 'She returned the dress to the shop because it was too small.', meaningVi: 'Cô ấy trả lại chiếc váy cho cửa hàng vì nó quá chật.', target: 'returned' },
    { english: "I'll return your laptop tomorrow morning after I finish my report.", meaningVi: 'Sáng mai, sau khi viết xong báo cáo, tôi sẽ trả lại máy tính cho bạn.', target: 'return' },
   ],
   advanced: [
    { kind: 'preposition', phrase: 'return sth to sb', meaningVi: 'trả lại cái gì cho ai', example: 'Please return the keys to reception when you leave.' },
    { kind: 'collocation', phrase: 'return sth on time', meaningVi: 'trả đúng hạn', example: 'Students must return borrowed laptops on time.' },
   ] },
  { lemma: 'keep', senseKey: 'keep.v.retain', partOfSpeech: 'verb', ipa: '/ˈkiːp/', audioFile: 'keep.mp3', forms: ['keeps', 'kept', 'keeping'], meaningVi: 'giữ lại', synonyms: ['retain'], noteVi: '',
   family: [{ word: 'keeper', partOfSpeech: 'noun', meaningVi: 'người trông giữ' }],
   cardExample: { english: "You can keep the book — I've already read it twice.", meaningVi: 'Bạn cứ giữ cuốn sách đó đi, tôi đã đọc nó hai lần rồi.', target: 'keep' },
   quizExamples: [
    { english: 'He kept all the letters his grandmother wrote to him.', meaningVi: 'Anh ấy giữ lại tất cả những lá thư bà viết cho mình.', target: 'kept' },
    { english: 'Keep your receipt in case you need to return the shoes.', meaningVi: 'Hãy giữ lại hóa đơn phòng khi bạn cần trả lại đôi giày.', target: 'Keep' },
   ],
   advanced: [
    { kind: 'collocation', phrase: 'keep the change', meaningVi: 'khỏi trả lại tiền thừa', example: "Here's ten dollars for the taxi — keep the change." },
    { kind: 'collocation', phrase: 'keep a secret', meaningVi: 'giữ bí mật', example: "Can you keep a secret? Don't tell anyone about the party." },
   ] },
 ],
});
