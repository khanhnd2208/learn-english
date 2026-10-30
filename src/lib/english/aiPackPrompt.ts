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
- Danh sách có thể là bảng (STT, từ, IPA, mạo từ a/an, nghĩa tiếng Việt): bỏ cột STT; dùng nghĩa đã cho để chọn đúng nghĩa cần học; IPA trong danh sách chỉ để tham khảo (danh sách hay ghi giọng Anh, bạn vẫn ghi giọng Mỹ); ghi chú mạo từ đặc biệt (an engineer, a university, an hour, không dùng a/an) là bẫy nên đưa vào noteVi.
- Bộ nghề nghiệp có cả tính từ (retired) hay danh từ chỉ nơi chốn (bank, hospital): mỗi từ vẫn giữ đúng loại từ của nó, không đổi thành danh từ chỉ người.
- Mọi trường bên dưới đều BẮT BUỘC có nội dung, trừ khi quy tắc của trường đó cho phép để trống.

TỪNG TRƯỜNG
- title: tên bộ (dùng đúng tên đã cho nếu có); description: một câu ngắn hoặc "".
- lemma: viết đúng như danh sách, kể cả dấu (café) và chữ hoa của tên riêng, viết tắt (IT worker); còn lại chữ thường.
- senseKey: "lemma.loại.nhãn". Phần lemma là lemma viết thường, giữ dấu nếu có (café → "café.n.coffee_shop", IT worker → "it worker.n.it_employee"); loại là n, v, adj, adv, prep, conj, phr, idiom; nhãn là 1–3 từ tiếng Anh không dấu, chữ thường, nối bằng "_". Không trùng nhau trong gói. Ví dụ: "give up.phr.stop_trying".
- partOfSpeech: tiếng Anh, viết thường: noun, verb, adjective, adverb, preposition, conjunction, phrasal verb, idiom.
- ipa: giọng Mỹ, đặt trong dấu / /; từ từ hai âm tiết trở lên có dấu trọng âm ˈ (từ một âm tiết như /nɝːs/ thì không cần); cụm nhiều chữ ghi IPA cả cụm (office worker → /ˈɑːfɪs ˌwɝːkɚ/).
- audioFile: lemma viết thường, bỏ dấu, dấu cách thay bằng "-", thêm ".mp3" (café → "cafe.mp3", IT worker → "it-worker.mp3", give up → "give-up.mp3"); mọi audioFile phải có trong audioFiles ở đầu gói, đúng thứ tự words.
- forms: chỉ các dạng BIẾN ĐỔI NGỮ PHÁP của chính từ này: số nhiều; -s, -ed, -ing, quá khứ, quá khứ phân từ; so sánh hơn/nhất (-er/-est); biến thể chính tả Anh–Anh. Không ghi lại lemma. Không ghi từ khác loại (happiness không phải dạng của happy — nó thuộc family).
  - Danh từ đếm được: BẮT BUỘC ghi số nhiều, kể cả danh từ ghép nhiều chữ (doctor → ["doctors"], office worker → ["office workers"], child → ["children"]).
  - Động từ: ghi đủ -s, -ed/quá khứ, quá khứ phân từ, -ing (give up → ["gives up", "gave up", "given up", "giving up"]).
  - Chỉ tính từ dạng -ed/-ing hoặc tính từ dài (excited, comfortable) và danh từ không đếm được mới thường có forms: [].
  - Mọi câu và mọi cụm trong gói chỉ được dùng lemma hoặc một dạng có trong forms; nếu định dùng dạng nào thì phải ghi nó vào forms.
- meaningVi: ngắn gọn (2–6 chữ), chỉ nêu đúng nghĩa của mục này, không liệt kê nhiều nghĩa khác nhau, không dùng dấu "/". Nếu danh sách đã ghi nghĩa bằng hai cách gọi của cùng một nghĩa (học sinh, sinh viên) thì giữ nguyên như danh sách.
- synonyms: tối đa ${EN_MAX_SYNONYMS} từ/cụm tiếng Anh cùng loại từ mà người Việt có thể gõ khi chỉ thấy meaningVi và loại từ (đáp án gõ trùng synonym được tính là gần đúng). Phải thật sự gần nghĩa và có trong từ điển; ưu tiên từ thông dụng trước từ hiếm.
  - KHÔNG ghi: lemma hay dạng của nó; một từ khác có trong DANH SÁCH TỪ (bộ có cả hospital và clinic thì không ghi clinic cho hospital); cụm tự ghép cho đủ số ("design professional", "nursing professional", "pharmacy professional"); từ đã ghi trong family.
  - Không có từ nào đạt thì để [].
- noteVi: tối đa một câu (dưới 200 ký tự), chỉ ghi bẫy thật sự (dễ nhầm với từ nào và khác thế nào, -ed/-ing, đếm được/không đếm được, sắc thái trang trọng). Không có bẫy thì để "".

HỌ TỪ (family) — luôn hiển thị trên thẻ, kể cả khi không bật "Nâng cao"
- Các từ CÙNG GỐC thông dụng (A2–C1) mà người học nên biết kèm: đổi loại từ (happy → happiness, happily), thêm tiền tố/hậu tố (happy → unhappy), hoặc gốc động từ/danh từ (worried → worry).
- Mỗi mục: { "word": từ tiếng Anh, "partOfSpeech": một trong ${EN_FAMILY_PARTS_OF_SPEECH.join(', ')}, "meaningVi": nghĩa ngắn 2–6 chữ, gắn với nghĩa đang học }.
- Tối đa ${EN_MAX_FAMILY} mục, xếp từ thông dụng nhất. Nếu cùng mặt chữ nhưng khác loại từ (worry là động từ và danh từ) thì ghi một mục, chọn loại phổ biến hơn.
- KHÔNG ghi: chính lemma, các dạng trong forms (happier, happiest), từ đồng nghĩa khác gốc, từ hiếm/cổ, từ tự chế ("redesigning" làm danh từ), từ đã ghi trong synonyms.
- Từ ghép nhiều chữ (office worker, tour guide): chỉ ghi từ cùng gốc của chữ chính mang nghĩa (worker → work; guide → guidance) khi thật sự hữu ích; không liệt kê lại từng chữ của cụm.
- KHÔNG ghi từ viết giống hệt một dạng trong forms dù nghĩa khác: mechanic có forms ["mechanics"] nên không ghi "mechanics" (cơ học) vào family; ghi "mechanical" thay thế. Chỉ để [] khi thật sự không có từ cùng gốc thông dụng (ví dụ "okay").

CÂU VÍ DỤ — phần quan trọng nhất của gói
Mỗi nghĩa có 1 cardExample và ${EN_QUIZ_EXAMPLES_MIN}–${EN_QUIZ_EXAMPLES_MAX} quizExamples (tổng 3–5 câu).
- cardExample: câu DUY NHẤT hiện trên thẻ học. quizExamples: bị ẩn, chỉ dùng làm câu hỏi điền từ (che target rồi cho chọn từ). Vì vậy câu hỏi phải là tình huống MỚI để người học phải hiểu nghĩa, không thể nhớ thuộc câu đã thấy.
- Mỗi câu 10–18 từ, là tiếng Anh tự nhiên người bản ngữ thật sự nói hoặc viết. Từ vựng xung quanh dễ (A2–B1) để người học tập trung vào từ đích.
- Mỗi câu là MỘT tình huống cụ thể, có đủ chi tiết (ai, đang ở đâu hoặc làm gì, vì sao) để đọc là hiểu và thấy rõ SẮC THÁI của từ: mức độ mạnh/nhẹ, cảm xúc tích cực/tiêu cực, hoàn cảnh hay dùng. Ví dụ "exhausted" cần chi tiết cho thấy mệt cực độ, "sleepy" cần chi tiết cho thấy muốn ngủ chứ không chỉ mệt.
- Tránh câu chung chung, rỗng nghĩa ("I am happy.", "It is good.") và tránh lặp một khuôn cho cả gói (không để mọi câu đều là "I'm X because ..."). Đổi chủ ngữ (I, she, my brother, we, the kids…), thì, dạng câu (khẳng định, phủ định, câu hỏi, lời thoại) và dạng từ trong forms.
- cardExample: câu tiêu biểu nhất, thể hiện cách dùng phổ biến nhất của nghĩa này; người mới đọc là hiểu ngay.
- quizExamples: mỗi câu một tình huống KHÁC HẲN cardExample, khác nhau và khác câu ví dụ ở phần nâng cao. Không viết lại cardExample bằng cách đổi vài chữ. Ngữ cảnh phải đủ mạnh để khi che target, chỉ đúng từ này điền tự nhiên — không phải từ đồng nghĩa hay một từ khác trong cùng danh sách (ví dụ phân biệt rõ tired / sleepy / exhausted, hungry / starving).
- quizExamples: KHÔNG đặt "a" hay "an" ngay trước target — khi che từ đích, "an ___" lộ ngay đáp án bắt đầu bằng nguyên âm. Dùng the, my, our, số nhiều, sở hữu cách, hoặc thêm tính từ ở giữa ("a good designer", "the engineers"). cardExample thì nên có a/an để người học thấy cách dùng mạo từ.
- target: chuỗi xuất hiện y nguyên đúng MỘT lần trong câu (giữ hoa/thường như trong câu) và phải là lemma hoặc một dạng trong forms.
- meaningVi: dịch đầy đủ, tự nhiên cả câu (không dịch word-by-word); phần dịch của từ đích phải đúng nghĩa meaningVi.

PHẦN NÂNG CAO (advanced) — BẮT BUỘC, hiện khi người học bật "Nâng cao" (B2–C2), không dùng để chấm
- Mỗi nghĩa ${EN_MIN_ADVANCED}–4 mục (tối đa ${EN_MAX_ADVANCED}): những cụm người bản ngữ thật sự hay dùng với ĐÚNG nghĩa này. Chỉ để [] khi từ thật sự không có cụm cố định nào (rất hiếm).
- Ưu tiên cụm tần suất cao mà người học B1–B2 sẽ gặp trong đời sống, công việc; tránh thuật ngữ chuyên ngành hẹp ("a publicly traded company", "hotel occupancy").
- kind là một trong: ${EN_ADVANCED_KINDS.join(', ')}. Chọn theo thứ tự ưu tiên:
  1. preposition: giới từ cố định đi kèm (afraid of sth, good at sth, depend on sb/sth). Từ có giới từ đi kèm thì BẮT BUỘC ghi, ghi đủ các giới từ phổ biến nếu nghĩa khác nhau (angry with sb / angry about sth).
  2. pattern: cấu trúc ngữ pháp, dùng sb / sth / V / V-ing / to V / that ... làm chỗ trống (glad to V, too tired to V, it is worth V-ing).
  3. collocation: từ hay đi cùng mà người Việt khó tự ghép: trạng từ nhấn mạnh (wide awake, deeply embarrassed), động từ đi kèm (stay calm, get ready, make sb proud), danh từ đi kèm (a nervous laugh).
  4. phrasal_verb / idiom: cụm động từ hoặc thành ngữ phổ biến chứa từ này (lend a hand, bored to death).
- KHÔNG ghi cụm hiển nhiên ai cũng tự ghép được và lặp ở mọi từ (feel X, very X, so X, really X); tối đa một cụm dạng "feel/look/get + từ" và chỉ khi nó có nét nghĩa riêng.
- Danh từ chỉ người, nghề nghiệp, đồ vật (doctor, driver, cashier) thường không có giới từ cố định: dùng collocation và pattern có từ đích đứng riêng thành một chữ, ví dụ "see a doctor", "a qualified mechanic", "a taxi driver", "work as a cashier", "become a freelancer". Đủ ${EN_MIN_ADVANCED} mục tốt là được; không bịa cụm cho đủ số.
- phrase: viết đúng cách dùng, phải chứa NGUYÊN lemma hoặc nguyên một dạng trong forms, đứng thành chữ riêng. Không trùng nhau.
  - Được: "see a doctor", "a doctor's note" (thêm 's sở hữu được chấp nhận), "a taxi driver".
  - Không được: dùng từ gốc hay từ khác loại thay cho từ đích ("work freelance" cho freelancer, "a mechanical problem" cho mechanic) — những từ đó thuộc family; dùng một phần của cụm từ ghép ("office staff", "a factory job" cho office worker / factory worker); dùng dạng chưa ghi trong forms.
- meaningVi: nghĩa ngắn của cả cụm.
- example: BẮT BUỘC, một câu tự nhiên 8–15 từ chứa nguyên cụm phrase (chỗ sb/sth/V thay bằng từ cụ thể) nên cũng chứa lemma hoặc một dạng trong forms; khác cardExample và mọi quizExamples.

TỰ KIỂM TRA TRƯỚC KHI TRẢ LỜI
- JSON parse được; mọi chuỗi dùng nháy kép; không dấu phẩy thừa.
- Mỗi senseKey bắt đầu bằng đúng lemma viết thường (giữ dấu), rồi ".loại.nhãn"; audioFile viết thường, không dấu.
- Không synonym nào là một từ khác trong danh sách, là cụm tự ghép, hay trùng family.
- Mỗi target nằm trong câu và thuộc [lemma, ...forms]; không quizExample nào có "a"/"an" đứng ngay trước target.
- Đếm số chữ: mỗi câu cardExample/quizExamples 10–18 chữ, mỗi example nâng cao 8–15 chữ.
- Với TỪNG mục advanced: tìm thấy lemma hoặc một dạng trong forms, nguyên chữ, trong cả phrase lẫn example. Không thấy thì sửa cụm hoặc thay cụm khác — không được giữ.
- Danh từ đếm được và động từ đã có forms; không mục family nào trùng lemma hay một dạng trong forms.
- Mỗi nghĩa có 1 cardExample, ${EN_QUIZ_EXAMPLES_MIN}–${EN_QUIZ_EXAMPLES_MAX} quizExamples không giống cardExample, ít nhất ${EN_MIN_ADVANCED} mục advanced có example, và family (hoặc [] nếu thật sự không có).
- Đọc lại các câu của cả gói: không có hai câu cùng khuôn, không có câu hỏi nào điền được bằng từ khác trong danh sách.
- Số mục words khớp số nghĩa đã chọn; senseKey không trùng; audioFiles đủ.`;

/** Issue as the admin sees it in the list under step 2. */
export interface AiRepairIssue { path: string; code: string; message: string }
/** Missing recordings and synonyms the checker already dropped are not the AI's to fix. */
const NOT_FOR_AI = new Set(['audio', 'synonym_in_pack']);

/**
 * Follow-up for the same AI chat: the exact problems the checker found, so the AI fixes only those
 * and sends the whole pack back. '' when nothing is left for the AI to fix.
 */
export function buildAiRepairPrompt(issues: AiRepairIssue[]): string {
 const lines = [...new Set(issues.filter((i) => !NOT_FOR_AI.has(i.code)).map((i) => `- ${i.path}: ${i.message}`))];
 if (!lines.length) return '';
 return `Hệ thống kiểm tra gói JSON bạn vừa trả về và thấy ${lines.length} lỗi:\n${lines.join('\n')}\n\nSửa đúng các lỗi trên theo QUY TẮC trong prompt ban đầu. Giữ nguyên mọi phần không có lỗi, không đổi thứ tự từ. Trả về lại TOÀN BỘ gói JSON hoàn chỉnh trong một khối, không markdown, không giải thích.`;
}

export function buildAiPackPrompt(wordList: string, packTitle = ''): string {
 return `Bạn là biên soạn viên từ vựng tiếng Anh cho người Việt. Tạo gói từ vựng JSON v4 cho ${packTitle ? `bộ "${packTitle}"` : 'danh sách từ sau'}.\n\nDANH SÁCH TỪ:\n${wordList.trim()}\n\n${RULES}\n\nMẪU (chỉ để xem định dạng và mức chất lượng, không chép nội dung):\n${JSON.stringify(AI_PACK_PROMPT_EXAMPLE, null, 2)}`;
}
