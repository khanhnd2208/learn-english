import { describe, expect, it } from 'vitest';
import {
	planDistractorRelations,
	planExampleOffsets,
	planSoftLinks,
} from '@/lib/english/relationBackfill';

describe('planDistractorRelations', () => {
	it('adds a confusable for each new distractor and skips ones already stored', () => {
		const plans = planDistractorRelations([
			{
				id: 's1',
				distractorLemmas: ['lend', 'Lend', 'return', ''],
				existingLemmas: ['return'],
			},
		]);
		expect(plans).toEqual([{ senseId: 's1', lemma: 'lend' }]);
	});
});

describe('planSoftLinks', () => {
	it('links a single sense and a family member, and leaves an ambiguous part of speech open', () => {
		const plan = planSoftLinks({
			relations: [
				{ id: 'r1', lemma: 'choose', targetSenseId: null, sourcePartOfSpeech: 'verb' },
				{ id: 'r2', lemma: 'record', targetSenseId: null, sourcePartOfSpeech: 'verb' },
				{ id: 'r3', lemma: 'lend', targetSenseId: 'already', sourcePartOfSpeech: 'verb' },
			],
			senses: [
				{ id: 'choose-1', lemmaKey: 'choose', partOfSpeech: 'verb' },
				{ id: 'record-n', lemmaKey: 'record', partOfSpeech: 'noun' },
				{ id: 'record-v', lemmaKey: 'record', partOfSpeech: 'verb' },
			],
			members: [
				{ id: 'm1', lemma: 'Decide', wordId: null },
				{ id: 'm2', lemma: 'decision', wordId: 'kept' },
			],
			words: [{ id: 'w-decide', lemmaKey: 'decide' }],
		});
		expect(plan.relationUpdates).toEqual([
			{ id: 'r1', targetSenseId: 'choose-1' },
			{ id: 'r2', targetSenseId: 'record-v' },
		]);
		expect(plan.memberUpdates).toEqual([{ id: 'm1', wordId: 'w-decide' }]);
	});
});

describe('planExampleOffsets', () => {
	it('fills one hit and reports a sentence that needs a person', () => {
		const plan = planExampleOffsets([
			{ id: 'e1', english: 'We decided to stay.', target: 'decided', targetStart: null },
			{ id: 'e2', english: 'I can lend this, but I can lend that.', target: 'lend', targetStart: null },
			{ id: 'e3', english: 'I need to ___ a pen.', target: 'borrow', targetStart: null },
			{ id: 'e4', english: 'Already marked.', target: 'marked', targetStart: 8 },
		]);
		expect(plan.updates).toEqual([{ id: 'e1', targetStart: 3, targetLength: 7 }]);
		expect(plan.report).toEqual([
			expect.objectContaining({ id: 'e2', reason: 'ambiguous' }),
		]);
	});
});
