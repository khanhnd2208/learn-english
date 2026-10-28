import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { blockedWordReasons, publishEnglishSetRequest } from '@/lib/english/publishClient';

/** Just enough of Prisma, in memory, to run import → publish → enroll end to end. */
const db = vi.hoisted(() => {
	type Row = Record<string, unknown> & { id: string };
	const tables: Record<string, Row[]> = {};
	let seq = 0;
	const table = (name: string) => (tables[name] ??= []);
	const matches = (row: Row, where: Record<string, unknown> = {}) => Object.entries(where).every(([key, value]) => {
		if (value && typeof value === 'object' && 'in' in value) return (value as { in: unknown[] }).in.includes(row[key]);
		if (value && typeof value === 'object' && !Array.isArray(value)) return Object.entries(value).every(([k, v]) => row[k] === v);
		return row[key] === value;
	});
	const model = (name: string, defaults: Record<string, unknown> = {}) => ({
		create: async ({ data }: { data: Record<string, unknown> }) => { const row = { id: `${name}${++seq}`, ...defaults, ...data }; table(name).push(row); return row; },
		findFirst: async ({ where }: { where?: Record<string, unknown> }) => table(name).find((row) => matches(row, where)) ?? null,
		findMany: async ({ where }: { where?: Record<string, unknown> } = {}) => table(name).filter((row) => matches(row, where)),
		update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => Object.assign(table(name).find((row) => matches(row, where))!, data),
		updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => { const rows = table(name).filter((row) => matches(row, where)); rows.forEach((row) => Object.assign(row, data)); return { count: rows.length }; },
		upsert: async ({ where, create, update }: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
			const found = table(name).find((row) => matches(row, where));
			if (found) return Object.assign(found, update);
			const row = { id: `${name}${++seq}`, ...create }; table(name).push(row); return row;
		},
	});
	const enSet = {
		...model('set', { listed: true, accessCode: null }),
		findUnique: async ({ where }: { where: { id: string } }) => {
			const set = table('set').find((row) => row.id === where.id);
			if (!set) return null;
			const items = table('item').filter((item) => item.setId === set.id).map((item) => {
				const sense = table('sense').find((row) => row.id === item.senseId)!;
				const examples = table('example').filter((e) => e.senseId === sense.id).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
				return { ...item, sense: { ...sense, word: table('word').find((w) => w.id === sense.wordId), examples } };
			});
			return { ...set, items };
		},
	};
	const prisma = { enSet, enSetItem: model('item'), enWord: model('word'), enSense: model('sense'), enExample: model('example'), enEnrollment: { ...model('enrollment'), findUnique: async () => null } };
	return { tables, prisma, reset: () => { for (const key of Object.keys(tables)) delete tables[key]; } };
});
vi.mock('@/lib/prisma', () => ({ prisma: { ...db.prisma, $transaction: (fn: (tx: typeof db.prisma) => Promise<unknown>) => fn(db.prisma) } }));
import { publishEnglishSet, saveEnglishPack } from '@/services/english/enContentService';
import { enrollEnglishSet } from '@/services/english/enCatalogService';

const noAudio = async () => false;
beforeEach(() => db.reset());

describe('AI pack → store → download', () => {
	it('publishes a saved pack so learners can download it, even without mp3 files', async () => {
		const { setId } = await saveEnglishPack(sampleEnglishPack);
		await expect(enrollEnglishSet('learner', setId)).rejects.toThrow('chưa xuất bản');
		const result = await publishEnglishSet(setId, noAudio);
		expect(result).toMatchObject({ publishedSenses: sampleEnglishPack.words.length, totalSenses: sampleEnglishPack.words.length, status: 'published' });
		expect(db.tables.set![0]!.status).toBe('published');
		expect(db.tables.sense!.every((sense) => sense.status === 'published')).toBe(true);
		await expect(enrollEnglishSet('learner', setId)).resolves.toBeUndefined();
	});

	it('keeps a word whose hidden question is broken, without ever showing that question', async () => {
		const pack = structuredClone(sampleEnglishPack);
		pack.words[0]!.quizExamples[0]!.meaningVi = 'mượn';
		pack.words[0]!.quizExamples[1]!.target = 'pen';
		expect(assessEnglishPack(pack).words[0]!.publishable).toBe(true);
		const { setId } = await saveEnglishPack(pack);
		expect((await publishEnglishSet(setId, noAudio)).publishedSenses).toBe(pack.words.length);
		const first = db.tables.example!.filter((e) => e.senseId === db.tables.item![0]!.senseId).map((e) => [e.sortOrder, e.role, e.status]);
		expect(first).toEqual([[0, 'study', 'published'], [1, 'study', 'draft'], [2, 'study', 'draft'], ...first.slice(3).map(([order]) => [order, 'grade', 'published'])]);
	});

	it('leaves the set a draft and says why when no word can be published', async () => {
		const pack = structuredClone(sampleEnglishPack);
		for (const word of pack.words) word.ipa = 'no slashes';
		const { setId } = await saveEnglishPack(pack);
		const result = await publishEnglishSet(setId, noAudio);
		expect(result).toMatchObject({ publishedSenses: 0, status: 'draft' });
		expect(db.tables.set![0]!.status).toBe('draft');
		expect(blockedWordReasons(result.issues)[0]).toContain('IPA');
	});
});

describe('publish request from the admin screens', () => {
	it('fails loudly instead of listing a set that is still a draft', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { publishedSenses: 0, totalSenses: 2, issues: [{ path: 'borrow: words.borrow', code: 'ipa', message: 'IPA cần nằm trong dấu / /.', blocksGrade: true }] } }))));
		await expect(publishEnglishSetRequest('set')).rejects.toThrow('borrow: IPA cần nằm trong dấu / /.');
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { publishedSenses: 2, totalSenses: 2, issues: [] } }))));
		await expect(publishEnglishSetRequest('set')).resolves.toMatchObject({ publishedSenses: 2 });
		vi.unstubAllGlobals();
	});
});
