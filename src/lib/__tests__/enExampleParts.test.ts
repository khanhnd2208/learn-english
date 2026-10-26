import { describe, expect, it } from 'vitest';
import { exampleParts } from '@/lib/english/senseBundle';

const base = { targetTag: '', targetStart: null, targetLength: null };

describe('exampleParts', () => {
	it('uses target offsets when present', () => {
		expect(exampleParts({ ...base, english: 'The tickets were expensive.', target: 'tickets', targetStart: 4, targetLength: 7 }))
			.toMatchObject({ before: 'The ', answer: 'tickets', after: ' were expensive.' });
	});

	it('fills a ___ blank with the target', () => {
		expect(exampleParts({ ...base, english: 'Please show your ___ to the driver.', target: 'ticket' }))
			.toMatchObject({ before: 'Please show your ', answer: 'ticket', after: ' to the driver.' });
	});

	it('returns null without a target position or blank', () => {
		expect(exampleParts({ ...base, english: 'No blank here.', target: 'ticket' })).toBeNull();
	});
});
