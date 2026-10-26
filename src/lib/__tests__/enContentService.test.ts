import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lowestCefr } from '@/lib/english/cefr';

const db = vi.hoisted(() => ({ tx: null as ReturnType<typeof createDb> | null }));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: (fn: (tx: ReturnType<typeof createDb>['tx']) => Promise<unknown>) => {
			if (!db.tx) throw new Error('missing tx');
			return fn(db.tx.tx);
		},
	},
}));

import { saveEnglishPack } from '@/services/english/enContentService';

type Row = Record<string, unknown>

function createDb() {
	let n = 0;
	const nextId = () => `id-${++n}`;
	const words: Row[] = [];
	const senses: Row[] = [];
	const examples: Row[] = [];
	const hints: Row[] = [];
	const relations: Row[] = [];
	const families: Row[] = [];
	const members: Row[] = [];

	function remove(rows: Row[], senseId: unknown) {
		for (let index = rows.length - 1; index >= 0; index -= 1) {
			if (rows[index]?.senseId === senseId) rows.splice(index, 1);
		}
	}

	function withId(data: Row): Row {
		return { ...data, id: nextId() };
	}

	const tx = {
		enSet: {
			create: async ({ data }: { data: Row }) => {
				const row = withId(data);
				return row;
			},
		},
		enSetItem: {
			create: async ({ data }: { data: Row }) => data,
		},
		enWord: {
			findUnique: async ({ where }: { where: { lemmaKey: string } }) => words.find((word) => word.lemmaKey === where.lemmaKey) ?? null,
			create: async ({ data }: { data: Row }) => {
				const row = withId(data);
				words.push(row);
				return row;
			},
			update: async ({ where, data }: { where: { id: string }; data: Row }) => {
				const row = words.find((word) => word.id === where.id);
				if (!row) throw new Error('missing word');
				Object.assign(row, data);
				return row;
			},
		},
		enSense: {
			findUnique: async ({ where }: { where: { senseKey: string } }) => senses.find((sense) => sense.senseKey === where.senseKey) ?? null,
			findMany: async ({ where }: { where: { word?: { lemmaKey?: string }; wordId?: string } }) => senses.filter((sense) => {
				if (where.wordId && sense.wordId !== where.wordId) return false;
				if (where.word?.lemmaKey) {
					const word = words.find((item) => item.id === sense.wordId);
					return word?.lemmaKey === where.word.lemmaKey;
				}
				return true;
			}),
			create: async ({ data }: { data: Row }) => {
				const row = withId(data);
				senses.push(row);
				return row;
			},
			update: async ({ where, data }: { where: { id: string }; data: Row }) => {
				const row = senses.find((sense) => sense.id === where.id);
				if (!row) throw new Error('missing sense');
				Object.assign(row, data);
				return row;
			},
		},
		enExample: {
			findMany: async ({ where }: { where: { senseId: string } }) => examples.filter((example) => example.senseId === where.senseId),
			create: async ({ data }: { data: Row }) => {
				const row = withId(data);
				examples.push(row);
				return row;
			},
			update: async ({ where, data }: { where: { id: string }; data: Row }) => {
				const row = examples.find((example) => example.id === where.id);
				if (!row) throw new Error('missing example');
				Object.assign(row, data);
				return row;
			},
		},
		enSenseHint: {
			deleteMany: async ({ where }: { where: { senseId: string } }) => {
				remove(hints, where.senseId);
				return { count: 0 };
			},
			create: async ({ data }: { data: Row }) => {
				const row = withId(data);
				hints.push(row);
				return row;
			},
		},
		enSenseRelation: {
			deleteMany: async ({ where }: { where: { senseId: string } }) => {
				remove(relations, where.senseId);
				return { count: 0 };
			},
			findUnique: async ({ where }: { where: { senseId_kind_lemma: { senseId: string; kind: string; lemma: string } } }) => {
				const key = where.senseId_kind_lemma;
				return relations.find((relation) => relation.senseId === key.senseId && relation.kind === key.kind && relation.lemma === key.lemma) ?? null;
			},
			create: async ({ data }: { data: Row }) => {
				const row = withId(data);
				relations.push(row);
				return row;
			},
			update: async ({ where, data }: { where: { id: string }; data: Row }) => {
				const row = relations.find((relation) => relation.id === where.id);
				if (!row) throw new Error('missing relation');
				Object.assign(row, data);
				return row;
			},
		},
		enWordFamily: {
			upsert: async ({ where, create, update }: { where: { key: string }; create: Row; update: Row }) => {
				let row = families.find((family) => family.key === where.key);
				if (!row) {
					row = withId(create);
					families.push(row);
				} else {
					Object.assign(row, update);
				}
				return row;
			},
		},
		enWordFamilyMember: {
			upsert: async ({ where, create, update }: { where: { familyId_lemma: { familyId: string; lemma: string } }; create: Row; update: Row }) => {
				const key = where.familyId_lemma;
				let row = members.find((member) => member.familyId === key.familyId && member.lemma === key.lemma);
				if (!row) {
					row = withId(create);
					members.push(row);
				} else {
					Object.assign(row, update);
				}
				return row;
			},
		},
		enPattern: { create: async ({ data }: { data: Row }) => withId(data) },
		enPatternSense: { create: async ({ data }: { data: Row }) => data },
		enPatternExample: { create: async ({ data }: { data: Row }) => data },
	};
	return { tx, words, senses, examples, hints, relations, families, members };
}

const pack = {
	title: 'Quyết định',
	packVersion: 2,
	families: [{
		key: 'decide',
		kind: 'derivation',
		root: 'decide',
		meaningVi: 'quyết định',
		members: [
			{ lemma: 'decide', partOfSpeech: 'verb', meaningVi: 'quyết định' },
			{ lemma: 'decision', partOfSpeech: 'noun', meaningVi: 'sự quyết định' },
		],
	}],
	words: [
		{
			lemma: 'decide',
			senseKey: 'decide.v.choose',
			partOfSpeech: 'verb',
			ipa: '/dɪˈsaɪd/',
			meaningVi: 'quyết định',
			relations: [{ kind: 'synonym', lemma: 'choose', noteVi: 'gần nghĩa' }],
			examples: [{
				english: 'We decided to stay at home because of the rain.',
				meaningVi: 'Chúng tôi quyết định ở nhà vì trời mưa.',
				target: 'decided',
				targetStart: 3,
				targetTag: 'past',
			}],
		},
		{
			lemma: 'choose',
			senseKey: 'choose.v.pick',
			partOfSpeech: 'verb',
			meaningVi: 'chọn',
		},
	],
};

beforeEach(() => {
	db.tx = createDb();
});

describe('lowestCefr', () => {
	it('picks the easiest published level, with pre_a1 below a1', () => {
		expect(lowestCefr(['b1', 'a2', null])).toBe('a2');
		expect(lowestCefr(['a1', 'pre_a1'])).toBe('pre_a1');
		expect(lowestCefr([null, undefined])).toBeNull();
	});
});

describe('saveEnglishPack', () => {
	it('reuses one word, updates the sense key, and keeps a filled IPA', async () => {
		await saveEnglishPack(pack);
		await saveEnglishPack({
			...pack,
			words: [
				{ ...pack.words[0], ipa: '', meaningVi: 'quyết định làm gì' },
				pack.words[1],
			],
		});
		const store = db.tx;
		if (!store) throw new Error('missing store');
		expect(store.words.map((word) => word.lemmaKey)).toEqual(['decide', 'choose']);
		expect(store.words[0]?.ipa).toBe('/dɪˈsaɪd/');
		expect(store.senses.filter((sense) => sense.senseKey === 'decide.v.choose')).toHaveLength(1);
		expect(store.senses.find((sense) => sense.senseKey === 'decide.v.choose')?.meaningVi).toBe('quyết định làm gì');
		expect(store.examples).toHaveLength(1);
		expect(store.examples[0]?.targetStart).toBe(3);
	});

	it('folds two senses of one lemma onto a single word', async () => {
		await saveEnglishPack({
			title: 'Record',
			words: [
				{ lemma: 'record', senseKey: 'record.n.disc', partOfSpeech: 'noun', meaningVi: 'đĩa' },
				{ lemma: 'Record', senseKey: 'record.v.store', partOfSpeech: 'verb', meaningVi: 'ghi lại' },
			],
		});
		expect(db.tx?.words).toHaveLength(1);
		expect(db.tx?.senses).toHaveLength(2);
		expect(new Set(db.tx?.senses.map((sense) => sense.wordId)).size).toBe(1);
	});

	it('writes the reverse relation when both senses exist and links family members', async () => {
		await saveEnglishPack(pack);
		const store = db.tx;
		if (!store) throw new Error('missing store');
		const decide = store.senses.find((sense) => sense.senseKey === 'decide.v.choose');
		const choose = store.senses.find((sense) => sense.senseKey === 'choose.v.pick');
		expect(store.relations).toEqual(expect.arrayContaining([
			expect.objectContaining({ senseId: decide?.id, kind: 'synonym', lemma: 'choose', targetSenseId: choose?.id }),
			expect.objectContaining({ senseId: choose?.id, kind: 'synonym', lemma: 'decide', targetSenseId: decide?.id }),
		]));
		expect(store.members.find((member) => member.lemma === 'decide')?.wordId).toBe(store.words[0]?.id);
		expect(store.members.find((member) => member.lemma === 'decision')?.wordId).toBeNull();
	});
});
