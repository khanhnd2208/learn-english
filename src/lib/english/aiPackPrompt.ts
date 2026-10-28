export const AI_PACK_PROMPT_EXAMPLE = {
 title: 'Ví dụ: belonging', description: '', packVersion: 3, audioFiles: ['belonging.mp3'],
 words: [{ lemma: 'belonging', senseKey: 'belonging.n.acceptance', partOfSpeech: 'noun', ipa: '/bɪˈlɔːŋɪŋ/', audioFile: 'belonging.mp3', forms: [], meaningVi: 'cảm giác thuộc về', synonyms: ['acceptance'], noteVi: '', examples: [
  { english: 'The club gave her a sense of belonging.', meaningVi: 'Câu lạc bộ cho cô ấy cảm giác được thuộc về.', target: 'belonging', gradable: true },
  { english: 'Belonging matters to many people.', meaningVi: 'Cảm giác thuộc về quan trọng với nhiều người.', target: 'Belonging', gradable: false },
 ] }],
};
const RULES = `Mỗi mục words là một nghĩa; meaningVi ngắn và chỉ nêu nghĩa đó.
Dùng IPA và audio giọng Mỹ; forms gồm các dạng biến đổi và biến thể chính tả Anh nếu có.
Synonyms rất quan trọng: liệt kê mọi từ tiếng Anh người Việt có thể gõ khi chỉ thấy nghĩa Việt và từ loại; thà thừa còn hơn thiếu.
NoteVi tối đa một câu, chỉ ghi bẫy thực sự; nếu không có thì để trống.
Viết 2–3 câu tự nhiên, ngắn, trình độ phổ thông; target phải đúng chuỗi trong câu.
Chỉ đặt gradable: true khi câu có chỗ trống cùng bản dịch Việt chỉ cho phép một từ điền tự nhiên. Nếu phân vân đặt false.
Không thêm trường ngoài mẫu.`;
export function buildAiPackPrompt(wordList: string, packTitle = ''): string {
 return `Tạo gói từ vựng JSON v3 cho ${packTitle || 'bộ từ sau'}:\n${wordList}\n\n${RULES}\n\nMẫu:\n${JSON.stringify(AI_PACK_PROMPT_EXAMPLE, null, 2)}`;
}
