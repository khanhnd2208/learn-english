import { EN_MAX_SYNONYMS, EN_QUIZ_EXAMPLES_MAX, EN_QUIZ_EXAMPLES_MIN } from '@/lib/english/constants';
import { EN_ADVANCED_KINDS, EN_MAX_ADVANCED, EN_MIN_ADVANCED } from '@/lib/english/advancedNotes';
import { EN_FAMILY_PARTS_OF_SPEECH, EN_MAX_FAMILY } from '@/lib/english/wordFamily';

export const AI_PACK_PROMPT_EXAMPLE = {
 title: 'Ví dụ: nervous', description: '', packVersion: 4, audioFiles: ['nervous.mp3'],
 words: [{ lemma: 'nervous', senseKey: 'nervous.adj.worried_before_event', partOfSpeech: 'adjective', ipa: '/ˈnɝːvəs/', audioFile: 'nervous.mp3', forms: [], meaningVi: 'hồi hộp', synonyms: ['anxious', 'uneasy', 'tense', 'jittery', 'on edge'], noteVi: 'Nervous là hồi hộp trước một việc sắp xảy ra; worried là lo về một chuyện có thể xấu.',
  family: [
   { word: 'nervously', partOfSpeech: 'adverb', meaningVi: 'một cách hồi hộp' },
   { word: 'nervousness', partOfSpeech: 'noun', meaningVi: 'sự hồi hộp' },
   { word: 'nerve', partOfSpeech: 'noun', meaningVi: 'dây thần kinh; sự gan dạ' },
  ],
  cardExample: { english: 'Maya always feels nervous before she speaks in front of the whole class.', meaningVi: 'Maya lúc nào cũng hồi hộp trước khi phát biểu trước cả lớp.', target: 'nervous' },
  quizExamples: [
   { english: 'My hands were shaking because I was so nervous on the morning of my job interview.', meaningVi: 'Tay tôi run lên vì sáng hôm phỏng vấn xin việc tôi hồi hộp quá.', target: 'nervous' },
   { english: "Don't be nervous — the doctor just wants to ask you a few simple questions.", meaningVi: 'Đừng hồi hộp, bác sĩ chỉ muốn hỏi bạn vài câu đơn giản thôi.', target: 'nervous' },
   { english: 'He gets nervous every time his phone rings and the screen says "Boss".', meaningVi: 'Cứ mỗi lần điện thoại reo và màn hình hiện chữ "Sếp" là anh ấy lại hồi hộp.', target: 'nervous' },
  ],
  advanced: [
   { kind: 'preposition', phrase: 'nervous about sth', meaningVi: 'hồi hộp về việc gì', example: 'She was nervous about meeting his parents for the first time.' },
   { kind: 'collocation', phrase: 'make sb nervous', meaningVi: 'khiến ai hồi hộp, bất an', example: 'Driving on busy roads at night makes me nervous.' },
   { kind: 'collocation', phrase: 'a nervous laugh', meaningVi: 'tiếng cười gượng vì ngại', example: 'He gave a nervous laugh when the teacher called his name.' },
   { kind: 'idiom', phrase: 'a nervous wreck', meaningVi: 'người căng thẳng tột độ', example: 'By the end of exam week, I was a nervous wreck.' },
  ] }],
};

const RULES = `QUY TẮC CHUNG
- Trả về đúng MỘT khối JSON hợp lệ, không markdown, không chú thích, không giải thích trước hay sau.
- Giữ đúng tên trường như mẫu; không thêm, không bỏ trường. packVersion luôn là 4.
- Giữ nguyên thứ tự từ trong danh sách. Không bỏ từ nào, không tự thêm từ ngoài danh sách.
- Một mục trong words là MỘT nghĩa. Từ nhiều nghĩa phổ biến thì tách thành nhiều mục, mỗi mục một senseKey riêng; chỉ giữ nghĩa thông dụng nhất (tối đa 2 nghĩa) trừ khi danh sách hoặc tên bộ đã gợi ý nghĩa (ví dụ bộ "Cảm giác" thì "free" là rảnh, không phải miễn phí).
- Cụm từ (give up, look after) giữ nguyên làm lemma.
- Mọi trường bên dưới đều BẮT BUỘC có nội dung, trừ khi quy tắc của trường đó cho phép để trống.

TỪNG TRƯỜNG
- title: tên bộ (dùng đúng tên đã cho nếu có); description: một câu ngắn hoặc "".
- lemma: dạng nguyên mẫu, chữ thường (trừ danh từ riêng).
- senseKey: "lemma.loại.nhãn", chỉ chữ thường, số, dấu cách, gạch nối, nháy đơn; loại là n, v, adj, adv, prep, conj, phr…; nhãn là 1–3 từ tiếng Anh nối bằng "_" mô tả nghĩa. Không trùng nhau trong gói. Ví dụ: "give up.phr.stop_trying".
- partOfSpeech: tiếng Anh, viết thường: noun, verb, adjective, adverb, preposition, conjunction, phrasal verb, idiom.
- ipa: giọng Mỹ, đặt trong dấu / /, có dấu trọng âm ˈ.
- audioFile: "<lemma>.mp3" (dấu cách thay bằng "-"); mọi audioFile phải có trong audioFiles ở đầu gói.
- forms: chỉ các dạng BIẾN ĐỔI NGỮ PHÁP của chính từ này: số nhiều; -s, -ed, -ing, quá khứ, quá khứ phân từ; so sánh hơn/nhất (-er/-est); biến thể chính tả Anh–Anh. Không ghi lại lemma. Không ghi từ khác loại (happiness không phải dạng của happy — nó thuộc family). Tính từ dạng -ed/-ing hoặc dài (excited, comfortable) thường có forms: [].
- meaningVi: ngắn gọn (2–6 chữ), chỉ nêu đúng nghĩa của mục này, không liệt kê nhiều nghĩa, không dùng dấu "/".
- synonyms: tối đa ${EN_MAX_SYNONYMS} từ/cụm tiếng Anh cùng loại từ mà người Việt có thể gõ khi chỉ thấy meaningVi và loại từ. Không chứa lemma hay dạng của nó. Phải thật sự gần nghĩa; ưu tiên từ thông dụng trước từ hiếm.
- noteVi: tối đa một câu (dưới 200 ký tự), chỉ ghi bẫy thật sự (dễ nhầm với từ nào và khác thế nào, -ed/-ing, đếm được/không đếm được, sắc thái trang trọng). Không có bẫy thì để "".

HỌ TỪ (family) — luôn hiển thị trên thẻ, kể cả khi không bật "Nâng cao"
- Các từ CÙNG GỐC thông dụng (A2–C1) mà người học nên biết kèm: đổi loại từ (happy → happiness, happily), thêm tiền tố/hậu tố (happy → unhappy), hoặc gốc động từ/danh từ (worried → worry).
- Mỗi mục: { "word": từ tiếng Anh, "partOfSpeech": một trong ${EN_FAMILY_PARTS_OF_SPEECH.join(', ')}, "meaningVi": nghĩa ngắn 2–6 chữ, gắn với nghĩa đang học }.
- Tối đa ${EN_MAX_FAMILY} mục, xếp từ thông dụng nhất. Nếu cùng mặt chữ nhưng khác loại từ (worry là động từ và danh từ) thì ghi một mục, chọn loại phổ biến hơn.
- KHÔNG ghi: chính lemma, các dạng trong forms (happier, happiest), từ đồng nghĩa khác gốc, từ hiếm/cổ. Chỉ để [] khi thật sự không có từ cùng gốc thông dụng (ví dụ "okay").

CÂU VÍ DỤ — phần quan trọng nhất của gói
Mỗi nghĩa có 1 cardExample và ${EN_QUIZ_EXAMPLES_MIN}–${EN_QUIZ_EXAMPLES_MAX} quizExamples (tổng 3–5 câu).
- cardExample: câu DUY NHẤT hiện trên thẻ học. quizExamples: bị ẩn, chỉ dùng làm câu hỏi điền từ (che target rồi cho chọn từ). Vì vậy câu hỏi phải là tình huống MỚI để người học phải hiểu nghĩa, không thể nhớ thuộc câu đã thấy.
- Mỗi câu 10–18 từ, là tiếng Anh tự nhiên người bản ngữ thật sự nói hoặc viết. Từ vựng xung quanh dễ (A2–B1) để người học tập trung vào từ đích.
- Mỗi câu là MỘT tình huống cụ thể, có đủ chi tiết (ai, đang ở đâu hoặc làm gì, vì sao) để đọc là hiểu và thấy rõ SẮC THÁI của từ: mức độ mạnh/nhẹ, cảm xúc tích cực/tiêu cực, hoàn cảnh hay dùng. Ví dụ "exhausted" cần chi tiết cho thấy mệt cực độ, "sleepy" cần chi tiết cho thấy muốn ngủ chứ không chỉ mệt.
- Tránh câu chung chung, rỗng nghĩa ("I am happy.", "It is good.") và tránh lặp một khuôn cho cả gói (không để mọi câu đều là "I'm X because ..."). Đổi chủ ngữ (I, she, my brother, we, the kids…), thì, dạng câu (khẳng định, phủ định, câu hỏi, lời thoại) và dạng từ trong forms.
- cardExample: câu tiêu biểu nhất, thể hiện cách dùng phổ biến nhất của nghĩa này; người mới đọc là hiểu ngay.
- quizExamples: mỗi câu một tình huống KHÁC HẲN cardExample, khác nhau và khác câu ví dụ ở phần nâng cao. Không viết lại cardExample bằng cách đổi vài chữ. Ngữ cảnh phải đủ mạnh để khi che target, chỉ đúng từ này điền tự nhiên — không phải từ đồng nghĩa hay một từ khác trong cùng danh sách (ví dụ phân biệt rõ tired / sleepy / exhausted, hungry / starving).
- target: chuỗi xuất hiện y nguyên đúng MỘT lần trong câu (giữ hoa/thường như trong câu) và phải là lemma hoặc một dạng trong forms.
- meaningVi: dịch đầy đủ, tự nhiên cả câu (không dịch word-by-word); phần dịch của từ đích phải đúng nghĩa meaningVi.

PHẦN NÂNG CAO (advanced) — BẮT BUỘC, hiện khi người học bật "Nâng cao" (B2–C2), không dùng để chấm
- Mỗi nghĩa ${EN_MIN_ADVANCED}–4 mục (tối đa ${EN_MAX_ADVANCED}): những cụm người bản ngữ thật sự hay dùng với ĐÚNG nghĩa này. Chỉ để [] khi từ thật sự không có cụm cố định nào (rất hiếm).
- kind là một trong: ${EN_ADVANCED_KINDS.join(', ')}. Chọn theo thứ tự ưu tiên:
  1. preposition: giới từ cố định đi kèm (afraid of sth, good at sth, depend on sb/sth). Từ có giới từ đi kèm thì BẮT BUỘC ghi, ghi đủ các giới từ phổ biến nếu nghĩa khác nhau (angry with sb / angry about sth).
  2. pattern: cấu trúc ngữ pháp, dùng sb / sth / V / V-ing / to V / that ... làm chỗ trống (glad to V, too tired to V, it is worth V-ing).
  3. collocation: từ hay đi cùng mà người Việt khó tự ghép: trạng từ nhấn mạnh (wide awake, deeply embarrassed), động từ đi kèm (stay calm, get ready, make sb proud), danh từ đi kèm (a nervous laugh).
  4. phrasal_verb / idiom: cụm động từ hoặc thành ngữ phổ biến chứa từ này (lend a hand, bored to death).
- KHÔNG ghi cụm hiển nhiên ai cũng tự ghép được và lặp ở mọi từ (feel X, very X, so X, really X); tối đa một cụm dạng "feel/look/get + từ" và chỉ khi nó có nét nghĩa riêng.
- phrase: viết đúng cách dùng, phải chứa lemma hoặc một dạng trong forms. Không trùng nhau.
- meaningVi: nghĩa ngắn của cả cụm.
- example: BẮT BUỘC, một câu tự nhiên 8–15 từ dùng đúng cụm đó, khác cardExample và mọi quizExamples.

TỰ KIỂM TRA TRƯỚC KHI TRẢ LỜI
- JSON parse được; mọi chuỗi dùng nháy kép; không dấu phẩy thừa.
- Mỗi target nằm trong câu và thuộc [lemma, ...forms]; mỗi phrase nâng cao chứa lemma hoặc một dạng.
- Mỗi nghĩa có 1 cardExample, ${EN_QUIZ_EXAMPLES_MIN}–${EN_QUIZ_EXAMPLES_MAX} quizExamples không giống cardExample, ít nhất ${EN_MIN_ADVANCED} mục advanced có example, và family (hoặc [] nếu thật sự không có).
- Đọc lại các câu của cả gói: không có hai câu cùng khuôn, không có câu hỏi nào điền được bằng từ khác trong danh sách.
- Số mục words khớp số nghĩa đã chọn; senseKey không trùng; audioFiles đủ.`;

export function buildAiPackPrompt(wordList: string, packTitle = ''): string {
 return `Bạn là biên soạn viên từ vựng tiếng Anh cho người Việt. Tạo gói từ vựng JSON v4 cho ${packTitle ? `bộ "${packTitle}"` : 'danh sách từ sau'}.\n\nDANH SÁCH TỪ:\n${wordList.trim()}\n\n${RULES}\n\nMẪU (chỉ để xem định dạng và mức chất lượng, không chép nội dung):\n${JSON.stringify(AI_PACK_PROMPT_EXAMPLE, null, 2)}`;
}
