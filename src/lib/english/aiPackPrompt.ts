/** Copy-paste prompt the admin gives to an AI to generate an English pack. Rules mirror contentValidation.ts. */

/** One fully worked word. A test keeps it publishable, so the prompt never drifts from the schema. */
export const AI_PACK_PROMPT_EXAMPLE = {
	title: 'Ví dụ: belonging',
	description: 'Một từ mẫu cho hướng dẫn prompt.',
	packVersion: 2,
	audioFiles: ['belonging.mp3', 'belonging-1.mp3', 'belonging-2.mp3'],
	families: [
		{
			key: 'belong',
			kind: 'derivation',
			root: 'belong',
			meaningVi: 'thuộc về',
			meaningEn: 'be part of a group or be owned by someone',
			originNote: '',
			members: [
				{
					lemma: 'belong',
					partOfSpeech: 'verb',
					affixNote: '',
					meaningVi: 'thuộc về',
				},
				{
					lemma: 'belonging',
					partOfSpeech: 'noun',
					affixNote: '+ -ing',
					meaningVi: 'cảm giác thuộc về',
				},
				{
					lemma: 'belongings',
					partOfSpeech: 'noun',
					affixNote: '+ -ings',
					meaningVi: 'đồ đạc',
				},
			],
		},
	],
	words: [
		{
			lemma: 'belonging',
			senseKey: 'belonging.n.feeling',
			entryType: 'word',
			partOfSpeech: 'noun',
			ipa: '/bɪˈlɒŋɪŋ/',
			ipaUk: '/bɪˈlɒŋɪŋ/',
			ipaUs: '/bɪˈlɔːŋɪŋ/',
			syllables: ['be', 'long', 'ing'],
			stressIndex: 1,
			stress: 'be-LONG-ing',
			cefr: 'b2',
			register: 'neutral',
			region: 'both',
			topics: ['feelings', 'people'],
			grammarTags: ['uncountable'],
			forms: ['belonging'],
			meaningVi: 'cảm giác thuộc về (một nhóm)',
			definitionEn: 'the feeling of being accepted as a natural member of a group',
			definitionEnSimple: 'feeling that you are part of a group',
			grammarNoteVi: 'Danh từ không đếm được: a sense of belonging, không nói a belonging hay belongings (belongings là đồ đạc).',
			chunks: [
				{
					text: 'a sense of belonging',
					vi: 'cảm giác thuộc về',
				},
				{
					text: 'a strong / deep sense of belonging',
					vi: 'cảm giác gắn bó sâu sắc',
				},
				{
					text: 'feel a sense of belonging (to / in sth)',
					vi: 'cảm thấy mình thuộc về (nơi nào, nhóm nào)',
				},
				{
					text: 'give sb a sense of belonging',
					vi: 'cho ai cảm giác được thuộc về',
				},
				{
					text: 'build / create / foster a sense of belonging',
					vi: 'xây dựng, tạo ra cảm giác gắn bó',
				},
				{
					text: 'lack a sense of belonging',
					vi: 'thiếu cảm giác thuộc về',
				},
				{
					text: 'a feeling of belonging',
					vi: 'cảm giác thuộc về (cách nói khác)',
				},
				{
					text: 'I\'ve never really felt a sense of belonging here.',
					vi: 'Tôi chưa bao giờ thật sự thấy mình thuộc về nơi này.',
				},
				{
					text: 'It gives me a sense of belonging.',
					vi: 'Nó cho tôi cảm giác mình thuộc về đây.',
				},
				{
					text: 'Everyone needs somewhere they feel they belong.',
					vi: 'Ai cũng cần một nơi mình cảm thấy thuộc về.',
				},
			],
			commonErrors: [
				{
					wrong: 'I have a belonging to this team.',
					right: 'I have a sense of belonging to this team.',
					whyVi: 'belonging (cảm giác) không đếm được, không đi với a. Nói a sense of belonging.',
				},
				{
					wrong: 'I left my belonging at the hotel.',
					right: 'I left my belongings at the hotel.',
					whyVi: 'Đồ đạc cá nhân luôn là belongings (số nhiều). belonging số ít là cảm giác thuộc về.',
				},
				{
					wrong: 'I feel belong to this city.',
					right: 'I feel I belong in this city.',
					whyVi: 'belong là động từ, cần chủ ngữ: I feel (that) I belong. Không ghép feel + belong.',
				},
				{
					wrong: 'This bag is belong to me.',
					right: 'This bag belongs to me.',
					whyVi: 'belong là động từ thường, không dùng với is. Ngôi thứ ba thêm -s: belongs to.',
				},
				{
					wrong: 'Do you feel a sense of belonging with this company?',
					right: 'Do you feel a sense of belonging to this company?',
					whyVi: 'Sau a sense of belonging dùng to (nhóm, tổ chức) hoặc in (nơi chốn), không dùng with.',
				},
			],
			pitfallVi: 'belonging = cảm giác thuộc về (không đếm được); belongings = đồ đạc; belong = động từ.',
			audioFile: 'belonging.mp3',
			distractorMeanings: ['sự cô đơn', 'lòng trung thành', 'sự tự tin'],
			distractorLemmas: ['loneliness', 'loyalty', 'confidence'],
			hints: [
				{
					order: 1,
					kind: 'category',
					textEn: 'A feeling about people around you.',
					textVi: 'Một cảm giác về những người xung quanh bạn.',
				},
				{
					order: 2,
					kind: 'function',
					textEn: 'You have it when a group treats you as one of them.',
					textVi: 'Bạn có nó khi một nhóm coi bạn là người nhà.',
				},
				{
					order: 3,
					kind: 'contrast',
					textEn: 'The opposite of feeling like an outsider.',
					textVi: 'Ngược với cảm giác mình là người ngoài.',
				},
			],
			relations: [
				{
					kind: 'confusable',
					lemma: 'belongings',
					confusableType: 'meaning',
					noteVi: 'belonging là cảm giác; belongings là đồ đạc mang theo.',
					contrast: [
						{
							lemma: 'belonging',
							en: 'The club gave him a sense of belonging.',
							vi: 'Câu lạc bộ cho anh ấy cảm giác thuộc về.',
						},
						{
							lemma: 'belongings',
							en: 'Please take all your belongings with you.',
							vi: 'Vui lòng mang theo toàn bộ đồ đạc của bạn.',
						},
					],
					mistake: {
						wrong: 'Please take your belonging.',
						right: 'Please take your belongings.',
					},
				},
			],
			examples: [
				{
					english: 'After ten years of hissing at us, the cat finally sleeps on Dad\'s pillow. She has found a sense of ___ in our family.',
					meaningVi: 'Sau mười năm xì xì với cả nhà, con mèo cuối cùng cũng ngủ trên gối của bố. Nó đã tìm thấy cảm giác thuộc về trong gia đình mình.',
					target: 'belonging',
					targetTag: 'base',
					audioFile: 'belonging-1.mp3',
					alternativesTried: ['humour', 'direction', 'urgency', 'style', 'timing'],
					stillPlausible: [],
				},
				{
					english: 'Six months after I joined, the office group chat finally added me. I almost cried — at last, a real sense of ___.',
					meaningVi: 'Sáu tháng sau khi tôi vào công ty, nhóm chat văn phòng cuối cùng cũng thêm tôi vào. Tôi suýt khóc, cuối cùng cũng có cảm giác thuộc về thật sự.',
					target: 'belonging',
					targetTag: 'base',
					audioFile: 'belonging-2.mp3',
					alternativesTried: ['humour', 'direction', 'urgency', 'style', 'smell'],
					stillPlausible: [],
				},
				{
					english: 'Matching Christmas pyjamas look silly, but they give the whole family a weird sense of belonging.',
					meaningVi: 'Đồ ngủ Giáng sinh giống nhau trông thật ngớ ngẩn, nhưng chúng cho cả nhà một cảm giác thuộc về kỳ lạ.',
					target: 'belonging',
					targetStart: 87,
					targetTag: 'base',
					audioFile: '',
				},
				{
					english: 'Football fans paint their faces and hug total strangers after a goal; for ninety minutes, it is pure belonging.',
					meaningVi: 'Cổ động viên bóng đá vẽ mặt và ôm cả người lạ sau bàn thắng; trong chín mươi phút, đó là cảm giác thuộc về trọn vẹn.',
					target: 'belonging',
					targetStart: 101,
					targetTag: 'base',
					audioFile: '',
				},
			],
		},
	],
};

const RULES = `Bạn là người soạn từ vựng tiếng Anh cho người Việt (trình độ A2–C1). Hãy tạo **một JSON duy nhất**, không kèm lời giải thích, theo đúng cấu trúc trong ví dụ ở cuối. Viết tiếng Việt tự nhiên như người Việt nói, không dịch máy.

### 1. Cách nói — \`chunks\`

Liệt kê **tất cả** những gì người bản ngữ hay nói với từ này. Không giới hạn số lượng, nhưng cũng đừng bịa cụm hiếm chỉ để kéo dài danh sách. Gồm:

- **Collocation**: tính từ, động từ, giới từ hay đi kèm (*a strong sense of belonging*, *build a sense of belonging*).
- **Khung ngữ pháp**: ghi \`sb\` và \`sth\` cho chỗ trống (*borrow sth from sb*, *feel a sense of belonging to sth*).
- **Cụm cố định, thành ngữ, phrasal verb** có chứa từ.
- **Mẫu câu hoàn chỉnh, dùng được ngay** khi nói hoặc viết (*I've never really felt a sense of belonging here.*). Đây là phần người học cần nhất, nên có ít nhất 2–3 câu.

Quy tắc:
- Sắp xếp theo mức độ hay dùng, phổ biến nhất lên đầu.
- Mỗi mục có \`text\` (tiếng Anh) và \`vi\` (nghĩa tiếng Việt tự nhiên).
- Không lặp ý giữa các mục. Biến thể nhỏ thì gộp bằng dấu \`/\` (*build / create / foster*).
- \`grammarNoteVi\`: một hai câu về ngữ pháp cốt lõi (đếm được hay không, đi với giới từ nào, theo sau là to V hay V-ing).

### 2. Phân biệt — \`commonErrors\`, \`pitfallVi\`, \`relations\`

\`commonErrors\`: liệt kê **mọi lỗi người Việt thật sự hay mắc** với từ này. Không giới hạn số lượng. Hãy rà qua các loại lỗi sau:

- Dịch từng chữ từ tiếng Việt sang.
- Sai giới từ đi kèm.
- Dùng sai đếm được hay không đếm được, sai số ít hay số nhiều.
- Nhầm dạng từ trong cùng họ (*belong / belonging / belongings*).
- Sai collocation (dùng *make* thay vì *do*, …).
- Sai sắc thái hoặc mức trang trọng.
- False friend, hoặc nhầm với từ có âm hay chữ gần giống.

Mỗi lỗi gồm:
- \`wrong\`: câu sai **mà người học thật sự viết hoặc nói ra**, không phải câu sai vô lý.
- \`right\`: câu đã sửa, giữ nguyên ý.
- \`whyVi\`: 1–2 câu nêu **quy tắc**, không chỉ nói "phải dùng X".

\`wrong\` và \`right\` phải khác nhau. Chỉ đưa vào lỗi có liên quan trực tiếp tới từ này.

\`pitfallVi\`: một dòng tóm tắt bẫy lớn nhất.

\`relations\`: với mỗi từ dễ nhầm, thêm một mục \`kind: "confusable"\` gồm:
- \`confusableType\`: một trong \`spelling\`, \`sound\`, \`meaning\`, \`false_friend\`, \`grammar\`, \`collocation\`.
- \`noteVi\`: phân biệt ngắn.
- \`contrast\`: **đúng 2 vế**, mỗi vế có \`lemma\`, \`en\`, \`vi\`.
- \`mistake\`: một cặp \`wrong\` / \`right\`.

### 3. Ví dụ — \`examples\`

Viết **3–5 câu**. Giọng văn được phép **hài hước, đời thường, hơi lố** để dễ nhớ: mèo, sếp, deadline, mẹ, crush, nhóm chat, kẹt xe… Không cần nghiêm túc, nhưng tiếng Anh phải tự nhiên và đúng ngữ pháp. Câu phải làm rõ nghĩa của từ: đọc xong là đoán được nghĩa.

Ít nhất **2 câu là câu điền** (dùng để chấm điểm). Câu điền cần:
- \`english\` có đúng một chỗ \`___\` thay cho từ.
- \`target\` là từ điền vào, phải là chính từ đó hoặc một dạng chia có trong \`forms\` / \`inflections\`. \`targetTag\` ghi dạng (\`base\`, \`past\`, \`ing\`, \`plural\`, …).
- \`meaningVi\` dịch **đủ cả câu**, không chỉ dịch nghĩa của từ.
- \`alternativesTried\`: ít nhất 5 từ khác bạn đã thử điền vào chỗ trống.
- \`stillPlausible\`: những từ trong số đó vẫn hợp với cả câu Anh lẫn nghĩa Việt. **Phải để rỗng.** Nếu không rỗng, hãy viết lại câu sao cho chỉ một từ điền được.
- \`audioFile\`: \`<lemma>-1.mp3\`, \`<lemma>-2.mp3\`, … và liệt kê trong \`audioFiles\` của pack.

Các câu còn lại là câu đọc: viết nguyên câu, ghi \`target\` và \`targetStart\` (vị trí ký tự, tính từ 0, nơi từ xuất hiện). Nếu được, hãy đa dạng dạng từ giữa các câu.

### 4. Các trường còn lại

- Pack: \`packVersion: 2\`, \`title\`, \`description\` (1 câu tiếng Việt), mọi từ trong danh sách nằm chung một \`words\`. Từ có nhiều nghĩa thì mỗi nghĩa là một mục riêng với \`senseKey\` khác nhau.
- \`lemma\`, \`senseKey\` (dạng \`lemma.loại.nhãn\`, ví dụ \`belonging.n.feeling\`), \`entryType\` (\`word\`, \`phrasal_verb\`, \`idiom\`, \`fixed_phrase\`), \`partOfSpeech\`.
- \`ipa\` trong dấu \`/ /\`, thêm \`ipaUk\` / \`ipaUs\` nếu hai giọng khác nhau. \`syllables\` ghép lại phải ra đúng từ. \`stressIndex\` đếm từ 0, kèm \`stress\` (ví dụ \`be-LONG-ing\`).
- \`inflections\` dùng tag trong danh sách \`base\`, \`plural\`, \`third_person\`, \`past\`, \`past_participle\`, \`ing\`, \`comparative\`, \`superlative\`. \`forms\` liệt kê mọi dạng.
- \`cefr\`: \`a1\` … \`c2\`. \`register\`: \`neutral\`, \`formal\`, \`informal\`, \`slang\`, … \`region\`: \`both\`, \`uk\`, \`us\`.
- \`topics\` chọn trong danh sách: \`daily_life\`, \`work\`, \`school\`, \`travel\`, \`food\`, \`health\`, \`shopping\`, \`home\`, \`people\`, \`feelings\`, \`nature\`, \`time\`, \`money\`, \`technology\`, \`culture\`, \`communication\`.
- \`grammarTags\` chọn trong danh sách: \`countable\`, \`uncountable\`, \`transitive\`, \`intransitive\`, \`+to_inf\`, \`+-ing\`, \`+that_clause\`, \`plural_only\`, \`singular_only\`.
- \`meaningVi\`: nghĩa ngắn. \`definitionEn\`: định nghĩa, **không chứa chính từ đó**. \`definitionEnSimple\`: định nghĩa dễ hiểu.
- \`hints\` (tab Tôi là ai?): **đúng 3**, \`order\` 1 → 3 từ mơ hồ đến rõ. Không chứa từ đó, dạng chia của nó hay từ cùng họ, và không chép lại \`meaningVi\`.
- \`distractorMeanings\` (≥ 2) và \`distractorLemmas\` (≥ 2): phương án nhiễu cùng chủ đề. Không được trùng với từ dễ nhầm hay từ cùng họ.
- \`audioFile\`: \`<lemma>.mp3\`.
- \`families\`: họ từ (\`belong\`, \`belonging\`, \`belongings\`), mỗi thành viên có \`affixNote\`.

### 5. Tự kiểm tra trước khi trả JSON

- [ ] \`chunks\` có collocation, khung ngữ pháp **và** mẫu câu hoàn chỉnh. Không có mục bịa.
- [ ] \`commonErrors\` đã rà đủ các loại lỗi ở mục 2. Mỗi lỗi có \`wrong\` ≠ \`right\` và \`whyVi\` nêu quy tắc.
- [ ] Mỗi \`confusable\` có \`confusableType\` và đúng 2 vế \`contrast\`.
- [ ] 3–5 ví dụ. Ít nhất 2 câu điền có đúng một \`___\`, \`meaningVi\` dịch đủ câu, ≥ 5 \`alternativesTried\`, \`stillPlausible\` rỗng.
- [ ] Đúng 3 \`hints\`, không lộ từ.
- [ ] Mọi file audio đều có trong \`audioFiles\`.
- [ ] JSON hợp lệ: không có comment, không có dấu phẩy thừa.
`;

export function buildAiPackPrompt(wordList: string, packTitle = ''): string {
	const words = wordList.trim() || '<dán từ hoặc chủ đề ở đây>';
	const title = packTitle.trim()
		? `Tên bộ (title): ${packTitle.trim()}`
		: 'Tên bộ (title): tự đặt ngắn gọn theo chủ đề của danh sách.';
	return [
		RULES,
		'### Ví dụ đầy đủ',
		'',
		'```json',
		JSON.stringify(AI_PACK_PROMPT_EXAMPLE, null, 2),
		'```',
		'',
		'### Danh sách từ cần làm',
		'',
		title,
		'',
		words,
		'',
	].join('\n');
}
