import { describe, expect, it } from 'vitest';
import { planLemmaKeyBackfill, type LemmaWordRow } from '@/lib/english/lemmaMerge';
import { lemmaKeyOf } from '@/lib/english/text';

function word(partial: Partial<LemmaWordRow> & Pick<LemmaWordRow, 'id' | 'lemma'>): LemmaWordRow {
	return {
		createdAt: new Date('2026-01-01T00:00:00Z'),
		ipa: '',
		audioPath: '',
		forms: [],
		senseIds: [],
		...partial,
	};
}

describe('lemmaKeyOf', () => {
	it('trims, lowercases, and collapses spaces without dropping hyphens', () => {
		expect(lemmaKeyOf('  Decide  ')).toBe('decide');
		expect(lemmaKeyOf('Give   UP')).toBe('give up');
		expect(lemmaKeyOf('Well-Known')).toBe('well-known');
	});
});

describe('planLemmaKeyBackfill', () => {
	it('keeps the oldest row, moves senses, and unions forms', () => {
		const plan = planLemmaKeyBackfill([
			word({
				id: 'new',
				lemma: 'Borrow',
				createdAt: new Date('2026-02-01T00:00:00Z'),
				ipa: '/ˈbɒrəʊ/',
				audioPath: 'borrow-new.mp3',
				forms: ['borrows', 'Borrowed'],
				senseIds: ['sense-new'],
			}),
			word({
				id: 'old',
				lemma: ' borrow ',
				createdAt: new Date('2026-01-01T00:00:00Z'),
				ipa: '',
				audioPath: '',
				forms: ['borrowed'],
				senseIds: ['sense-old'],
			}),
			word({
				id: 'lend',
				lemma: 'lend',
				ipa: '/lend/',
				forms: ['lent'],
				senseIds: ['sense-lend'],
			}),
		]);

		expect(plan.duplicateGroups).toBe(1);
		expect(plan.sensesMoved).toBe(1);
		const borrow = plan.keeps.find((keep) => keep.lemmaKey === 'borrow');
		expect(borrow).toMatchObject({
			id: 'old',
			ipa: '/ˈbɒrəʊ/',
			audioPath: 'borrow-new.mp3',
			deleteIds: ['new'],
			senseMoves: [{ senseId: 'sense-new', toWordId: 'old' }],
		});
		expect(borrow?.forms).toEqual(['borrowed', 'borrows']);
		expect(plan.keeps.find((keep) => keep.id === 'lend')?.deleteIds).toEqual([]);
	});

	it('breaks a createdAt tie by id and does not invent sense moves', () => {
		const createdAt = new Date('2026-03-01T00:00:00Z');
		const plan = planLemmaKeyBackfill([
			word({ id: 'b', lemma: 'keep', createdAt, senseIds: ['s2'] }),
			word({ id: 'a', lemma: 'KEEP', createdAt, senseIds: ['s1'] }),
		]);
		expect(plan.keeps[0]).toMatchObject({
			id: 'a',
			deleteIds: ['b'],
			senseMoves: [{ senseId: 's2', toWordId: 'a' }],
		});
	});
});
