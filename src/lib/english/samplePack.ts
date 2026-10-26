import { englishPackSchema, type EnglishPack } from '@/lib/english/contentValidation';

const tried = ['lend', 'take', 'get', 'use', 'rent'];

function gradeExample(
	english: string,
	meaningVi: string,
	target: string,
	audioFile: string,
	alternativesTried: string[] = tried,
	stillPlausible: string[] = [],
) {
	return { english, meaningVi, target, audioFile, alternativesTried, stillPlausible };
}

function hints(rows: Array<[string, string, string]>) {
	return rows.map(([kind, textEn, textVi]) => ({ kind, textEn, textVi }));
}

/** Small approved-shaped pack used by tests and the admin preview. Audio files are names only. */
export const sampleEnglishPack: EnglishPack = englishPackSchema.parse({
	title: 'Mượn và trả',
	description: 'Bộ mẫu để kiểm tra quy trình tiếng Anh.',
	packVersion: 2,
	audioFiles: [
		'borrow.mp3', 'borrow-1.mp3', 'borrow-2.mp3', 'borrow-3.mp3', 'borrow-4.mp3',
		'lend.mp3', 'lend-1.mp3', 'lend-2.mp3',
		'return.mp3', 'return-1.mp3', 'return-2.mp3',
		'keep.mp3', 'keep-1.mp3', 'keep-2.mp3',
		'pattern-1.mp3', 'pattern-2.mp3',
	],
	families: [
		{
			key: 'borrow',
			kind: 'derivation',
			root: 'borrow',
			meaningVi: 'mượn',
			meaningEn: 'take for a short time',
			originNote: '',
			members: [
				{ lemma: 'borrow', partOfSpeech: 'verb', affixNote: '', meaningVi: 'mượn' },
				{ lemma: 'borrower', partOfSpeech: 'noun', affixNote: '+ -er', meaningVi: 'người đi mượn' },
			],
		},
	],
	words: [
		{
			lemma: 'borrow',
			senseKey: 'borrow.v.take',
			entryType: 'word',
			partOfSpeech: 'verb',
			ipa: '/ˈbɒrəʊ/',
			ipaUk: '/ˈbɒrəʊ/',
			ipaUs: '/ˈbɑːroʊ/',
			syllables: ['bor', 'row'],
			stressIndex: 0,
			stress: 'BOR-row',
			inflections: [
				{ form: 'borrows', tag: 'third_person' },
				{ form: 'borrowed', tag: 'past' },
				{ form: 'borrowed', tag: 'past_participle' },
				{ form: 'borrowing', tag: 'ing' },
			],
			frequencyRank: 1480,
			cefr: 'a2',
			forms: ['borrow', 'borrows', 'borrowed', 'borrowing'],
			meaningVi: 'mượn',
			definitionEn: 'to take and use something that belongs to another person for a short time',
			definitionEnSimple: 'to use something that is not yours for a short time, then give it back',
			register: 'neutral',
			region: 'both',
			topics: ['daily_life', 'school'],
			grammarTags: ['transitive'],
			grammarNoteVi: 'borrow something from someone. Không nói borrow someone something.',
			collocations: ['borrow a pen', 'borrow money'],
			chunks: [
				{ text: 'borrow something from someone', vi: 'mượn cái gì của ai' },
				{ text: 'borrow a pen', vi: 'mượn một cây bút' },
			],
			commonErrors: [
				{ wrong: 'Can you borrow me a pen?', right: 'Can I borrow a pen?', whyVi: 'borrow là mình nhận. Nhờ người khác đưa đồ thì dùng lend.' },
			],
			pitfallVi: 'borrow là đi mượn. lend là cho người khác mượn.',
			audioFile: 'borrow.mp3',
			imageFile: '',
			distractorMeanings: [],
			distractorLemmas: [],
			hints: hints([
				['context', 'You do this when you need a pen and a friend has one.', 'Bạn làm việc này khi cần một cây bút và bạn của bạn đang có.'],
				['function', 'It lets you use something for a while, then give it back.', 'Nó cho bạn dùng một thứ một lúc, rồi đưa lại.'],
				['contrast', 'The other person is the one who hands the thing over.', 'Người kia là người đưa đồ cho bạn.'],
			]),
			relations: [
				{
					kind: 'confusable',
					lemma: 'lend',
					confusableType: 'meaning',
					noteVi: 'borrow là mình nhận; lend là mình cho mượn.',
					contrast: [
						{ lemma: 'borrow', en: 'I borrow a pen from Lan.', vi: 'Tôi mượn bút của Lan.' },
						{ lemma: 'lend', en: 'Lan lends me a pen.', vi: 'Lan cho tôi mượn bút.' },
					],
					mistake: { wrong: 'Can you borrow me your pen?', right: 'Can I borrow your pen?' },
				},
			],
			examples: [
				gradeExample('I need to ___ a pen from Lan.', 'Tôi cần mượn một cây bút từ Lan.', 'borrow', 'borrow-1.mp3'),
				gradeExample('Can I ___ this dictionary until Friday?', 'Tôi có thể mượn cuốn từ điển này đến thứ Sáu không?', 'borrow', 'borrow-2.mp3'),
				gradeExample(
					'I will ___ this book.',
					'Tôi sẽ lấy cuốn sách này.',
					'borrow',
					'borrow-3.mp3',
					['buy', 'read', 'keep', 'take', 'get'],
					['buy', 'keep'],
				),
				{
					english: 'I borrowed a pen from Lan yesterday.',
					meaningVi: 'Hôm qua tôi đã mượn một cây bút từ Lan.',
					target: 'borrowed',
					targetStart: 2,
					targetTag: 'past',
					cefr: 'a2',
					origin: 'authored',
					audioFile: 'borrow-4.mp3',
					alternativesTried: tried,
					stillPlausible: [],
				},
			],
		},
		{
			lemma: 'lend',
			senseKey: 'lend.v.give',
			partOfSpeech: 'verb',
			ipa: '/lend/',
			ipaUk: '/lend/',
			ipaUs: '/lend/',
			stress: 'lend',
			cefr: 'a2',
			forms: ['lend', 'lends', 'lent', 'lending'],
			meaningVi: 'cho mượn',
			definitionEn: 'to let someone use something of yours for a short time',
			definitionEnSimple: 'to give someone something of yours for a while',
			collocations: ['lend a pen', 'lend money'],
			chunks: [
				{ text: 'lend someone something', vi: 'cho ai mượn cái gì' },
				{ text: 'lend a pen', vi: 'cho mượn một cây bút' },
			],
			commonErrors: [
				{ wrong: 'I lend a pen from Lan.', right: 'Lan lends me a pen.', whyVi: 'lend là mình đưa. Mình nhận thì dùng borrow.' },
			],
			pitfallVi: 'lend là đưa đồ cho người khác mượn.',
			audioFile: 'lend.mp3',
			hints: hints([
				['context', 'A friend needs your pen, and you hand it to them.', 'Một người bạn cần bút của bạn, và bạn đưa cho họ.'],
				['function', 'You still own the thing, but someone else uses it for a while.', 'Bạn vẫn là chủ, nhưng người khác dùng một lúc.'],
				['contrast', 'The other person is the one who takes the thing.', 'Người kia là người nhận đồ.'],
			]),
			relations: [
				{
					kind: 'confusable',
					lemma: 'borrow',
					confusableType: 'meaning',
					noteVi: 'lend là mình cho; borrow là mình nhận.',
					contrast: [
						{ lemma: 'lend', en: 'I can lend you this umbrella.', vi: 'Tôi có thể cho bạn mượn chiếc ô này.' },
						{ lemma: 'borrow', en: 'Can I borrow this umbrella?', vi: 'Tôi mượn chiếc ô này được không?' },
					],
					mistake: { wrong: 'Can I lend your pen?', right: 'Can you lend me your pen?' },
				},
			],
			examples: [
				gradeExample('Can you ___ me a pen?', 'Bạn cho tôi mượn một cây bút được không?', 'lend', 'lend-1.mp3', ['borrow', 'give', 'pass', 'hand', 'offer']),
				gradeExample('I can ___ you this umbrella.', 'Tôi có thể cho bạn mượn chiếc ô này.', 'lend', 'lend-2.mp3', ['borrow', 'give', 'pass', 'hand', 'offer']),
			],
		},
		{
			lemma: 'return',
			senseKey: 'return.v.give_back',
			partOfSpeech: 'verb',
			ipa: '/rɪˈtɜːn/',
			ipaUk: '/rɪˈtɜːn/',
			ipaUs: '/rɪˈtɝːn/',
			stress: 're-TURN',
			cefr: 'a2',
			forms: ['return', 'returns', 'returned', 'returning'],
			meaningVi: 'trả lại',
			definitionEn: 'to give something back to the person it came from',
			definitionEnSimple: 'to give something back to its owner',
			collocations: ['return a book', 'return a favor'],
			chunks: [
				{ text: 'return a book', vi: 'trả lại một cuốn sách' },
				{ text: 'return something to someone', vi: 'trả lại cái gì cho ai' },
			],
			pitfallVi: 'return ở đây là đưa lại đồ đã mượn.',
			audioFile: 'return.mp3',
			hints: hints([
				['context', 'The book you used is due at the library today.', 'Cuốn sách bạn đã dùng đến hạn ở thư viện hôm nay.'],
				['function', 'It puts a thing back with the person who owns it.', 'Nó đưa một thứ về với người chủ.'],
				['contrast', 'After this, the thing is not with you anymore.', 'Sau việc này, đồ không còn ở chỗ bạn.'],
			]),
			examples: [
				gradeExample('Please ___ the book tomorrow.', 'Hãy trả lại cuốn sách vào ngày mai.', 'return', 'return-1.mp3', ['keep', 'bring', 'take', 'give', 'hold']),
				gradeExample('I will ___ your umbrella tonight.', 'Tôi sẽ trả lại ô của bạn vào tối nay.', 'return', 'return-2.mp3', ['keep', 'bring', 'take', 'give', 'hold']),
			],
		},
		{
			lemma: 'keep',
			senseKey: 'keep.v.hold',
			partOfSpeech: 'verb',
			ipa: '/kiːp/',
			ipaUk: '/kiːp/',
			ipaUs: '/kiːp/',
			stress: 'keep',
			cefr: 'a2',
			forms: ['keep', 'keeps', 'kept', 'keeping'],
			meaningVi: 'giữ',
			definitionEn: 'to continue to have something instead of giving it back',
			definitionEnSimple: 'to still have something, and not give it back',
			collocations: ['keep a receipt', 'keep the change'],
			chunks: [
				{ text: 'keep a receipt', vi: 'giữ tờ hóa đơn' },
				{ text: 'keep the change', vi: 'giữ tiền thừa' },
			],
			pitfallVi: 'keep là giữ lại, không phải trả lại.',
			audioFile: 'keep.mp3',
			hints: hints([
				['context', 'Someone offers you a pen and says you do not have to give it back.', 'Ai đó đưa bạn một cây bút và nói bạn không cần đưa lại.'],
				['function', 'The thing stays with you.', 'Đồ vật ở lại với bạn.'],
				['contrast', 'The opposite of handing the thing back to its owner.', 'Ngược với việc đưa đồ lại cho chủ.'],
			]),
			examples: [
				gradeExample('You can ___ this pen.', 'Bạn có thể giữ cây bút này.', 'keep', 'keep-1.mp3', ['borrow', 'take', 'hold', 'use', 'return']),
				gradeExample('I will ___ the receipt.', 'Tôi sẽ giữ tờ hóa đơn này.', 'keep', 'keep-2.mp3', ['borrow', 'take', 'hold', 'lose', 'return']),
			],
		},
	],
	patterns: [
		{
			purposeVi: 'Nhờ được dùng đồ của người khác',
			frame: 'Could I ___ your ___?',
			fixedParts: ['Could I', 'your'],
			slots: [
				{ id: 'verb', labelVi: 'động từ', choices: ['borrow', 'use'] },
				{ id: 'thing', labelVi: 'đồ vật', choices: ['pen', 'charger'] },
			],
			pitfallVi: 'Phần Could I và your giữ nguyên. Chỉ thay động từ và đồ vật.',
			senseLemmas: ['borrow'],
			examples: [
				{
					english: 'Could I borrow your pen?',
					meaningVi: 'Tôi có thể mượn bút của bạn không?',
					audioFile: 'pattern-1.mp3',
					slotValues: [
						{ id: 'verb', value: 'borrow' },
						{ id: 'thing', value: 'pen' },
					],
				},
				{
					english: 'Could I use your charger?',
					meaningVi: 'Tôi có thể dùng sạc của bạn không?',
					audioFile: 'pattern-2.mp3',
					slotValues: [
						{ id: 'verb', value: 'use' },
						{ id: 'thing', value: 'charger' },
					],
				},
			],
		},
	],
});
