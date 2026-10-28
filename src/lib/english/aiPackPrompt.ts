import { EN_MAX_EXAMPLES_PER_WORD, EN_MAX_SYNONYMS } from '@/lib/english/constants';
import { EN_ADVANCED_KINDS, EN_MAX_ADVANCED } from '@/lib/english/advancedNotes';

export const AI_PACK_PROMPT_EXAMPLE = {
 title: 'Ví dụ: belonging', description: '', packVersion: 3, audioFiles: ['belonging.mp3'],
 words: [{ lemma: 'belonging', senseKey: 'belonging.n.acceptance', partOfSpeech: 'noun', ipa: '/bɪˈlɔːŋɪŋ/', audioFile: 'belonging.mp3', forms: [], meaningVi: 'cảm giác thuộc về', synonyms: ['acceptance', 'inclusion'], noteVi: '', advanced: [
  { kind: 'collocation', phrase: 'a sense of belonging', meaningVi: 'cảm giác được thuộc về', example: 'Team sports give children a sense of belonging.' },
  { kind: 'collocation', phrase: 'a strong feeling of belonging', meaningVi: 'cảm giác gắn bó mạnh mẽ', example: 'Volunteers often develop a strong feeling of belonging.' },
  { kind: 'preposition', phrase: 'belonging to a group', meaningVi: 'thuộc về một nhóm', example: 'Belonging to a group can reduce stress.' },
 ], examples: [
  { english: 'The club gave her a sense of belonging.', meaningVi: 'Câu lạc bộ cho cô ấy cảm giác được thuộc về.', target: 'belonging', gradable: true },
  { english: 'Belonging matters to many people.', meaningVi: 'Cảm giác thuộc về quan trọng với nhiều người.', target: 'Belonging', gradable: false },
 ] }],
};

const RULES = `QUY TẮC CHUNG
- Trả về đúng MỘT khối JSON hợp lệ, không markdown, không chú thích, không giải thích trước hay sau.
- Giữ đúng tên trường và thứ tự như mẫu; không thêm, không bỏ trường. packVersion luôn là 3.
- Giữ nguyên thứ tự từ trong danh sách. Không bỏ từ nào, không tự thêm từ ngoài danh sách.
- Một mục trong words là MỘT nghĩa. Từ nhiều nghĩa phổ biến thì tách thành nhiều mục, mỗi mục một senseKey riêng; chỉ giữ nghĩa thông dụng nhất (tối đa 2 nghĩa) trừ khi danh sách ghi rõ nghĩa.
- Cụm từ (give up, look after) giữ nguyên làm lemma.

TỪNG TRƯỜNG
- title: tên bộ (dùng đúng tên đã cho nếu có); description: một câu ngắn hoặc "".
- lemma: dạng nguyên mẫu, chữ thường (trừ danh từ riêng).
- senseKey: "lemma.loại.nhãn", chỉ chữ thường, số, dấu cách, gạch nối, nháy đơn; loại là n, v, adj, adv, prep, conj, phr…; nhãn là 1–3 từ tiếng Anh nối bằng "_" mô tả nghĩa. Không trùng nhau trong gói. Ví dụ: "give up.phr.stop_trying".
- partOfSpeech: tiếng Anh, viết thường: noun, verb, adjective, adverb, preposition, conjunction, phrasal verb, idiom.
- ipa: giọng Mỹ, đặt trong dấu / /, có dấu trọng âm ˈ.
- audioFile: "<lemma>.mp3" (dấu cách thay bằng "-"); mọi audioFile phải có trong audioFiles ở đầu gói.
- forms: mọi dạng biến đổi thật sự dùng được (số nhiều; -s, -ed, -ing, quá khứ phân từ bất quy tắc; so sánh hơn/nhất) và biến thể chính tả Anh–Anh nếu có. Không ghi lại chính lemma. Không ghi từ khác gốc (belong không phải dạng của belonging).
- meaningVi: ngắn gọn (2–6 chữ), chỉ nêu đúng nghĩa của mục này, không liệt kê nhiều nghĩa, không dùng dấu "/".
- synonyms: tối đa ${EN_MAX_SYNONYMS} từ/cụm tiếng Anh cùng loại từ mà người Việt có thể gõ khi chỉ thấy meaningVi và loại từ. Không chứa lemma hay dạng của nó. Thà thừa còn hơn thiếu, nhưng phải thật sự gần nghĩa.
- noteVi: tối đa một câu (dưới 200 ký tự), chỉ ghi bẫy thật sự (nhầm với từ khác, đếm được/không đếm được, sắc thái trang trọng). Không có bẫy thì để "".

CÂU VÍ DỤ (examples)
- 2–3 câu, tối đa ${EN_MAX_EXAMPLES_PER_WORD}. Câu tự nhiên, ngắn (6–14 từ), trình độ phổ thông, ngữ cảnh đời sống hoặc học tập. Mỗi câu một ngữ cảnh khác nhau.
- target: chuỗi xuất hiện y nguyên đúng MỘT lần trong câu (giữ hoa/thường như trong câu) và phải là lemma hoặc một dạng trong forms.
- meaningVi: dịch đầy đủ, tự nhiên cả câu, có chứa ý nghĩa của từ đích.
- gradable: true chỉ khi che target đi, người đọc bản dịch Việt chỉ điền được tự nhiên đúng từ này (không phải synonym). Ít nhất một câu gradable: true. Phân vân thì đặt false.

PHẦN NÂNG CAO (advanced) — đọc thêm cho người học B2–C2, không dùng để chấm
- Mảng 0–${EN_MAX_ADVANCED} mục, chỉ ghi những gì người bản ngữ thật sự hay dùng với ĐÚNG nghĩa này; từ quá cơ bản hoặc không có cụm đáng học thì để [].
- kind là một trong: ${EN_ADVANCED_KINDS.join(', ')}.
  collocation: từ hay đi cùng (động từ + danh từ, tính từ + danh từ, trạng từ + tính từ…), ví dụ "make a decision".
  preposition: giới từ cố định đi kèm, ví dụ "depend on sb/sth", "interested in".
  pattern: mẫu câu/cấu trúc ngữ pháp, dùng sb/sth/V-ing/to V làm chỗ trống, ví dụ "it is worth V-ing".
  phrasal_verb: cụm động từ chứa từ này. idiom: thành ngữ chứa từ này.
- phrase: viết đúng cách dùng, phải chứa lemma hoặc một dạng trong forms. Không trùng nhau, không lặp lại nguyên câu ví dụ.
- meaningVi: nghĩa ngắn của cả cụm.
- example: một câu ngắn tự nhiên dùng cụm đó (có thể để "" nếu cụm đã tự rõ nghĩa).

TỰ KIỂM TRA TRƯỚC KHI TRẢ LỜI
- JSON parse được; mọi chuỗi dùng nháy kép; không dấu phẩy thừa.
- Mỗi target nằm trong câu và thuộc [lemma, ...forms]; mỗi phrase nâng cao chứa lemma hoặc một dạng.
- Số mục words khớp số nghĩa đã chọn; senseKey không trùng; audioFiles đủ.`;

export function buildAiPackPrompt(wordList: string, packTitle = ''): string {
 return `Bạn là biên soạn viên từ vựng tiếng Anh cho người Việt. Tạo gói từ vựng JSON v3 cho ${packTitle ? `bộ "${packTitle}"` : 'danh sách từ sau'}.\n\nDANH SÁCH TỪ:\n${wordList.trim()}\n\n${RULES}\n\nMẪU (chỉ để xem định dạng, không chép nội dung):\n${JSON.stringify(AI_PACK_PROMPT_EXAMPLE, null, 2)}`;
}
