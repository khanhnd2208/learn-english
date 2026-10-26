import { describe, expect, it } from 'vitest';
import { isCounted, vnDayKey } from '@/lib/english/gapRule';

describe('vnDayKey', () => {
	it('uses the Vietnam calendar across midnight', () => {
		expect(vnDayKey(new Date('2026-10-22T16:59:00.000Z'))).toBe('2026-10-22');
		expect(vnDayKey(new Date('2026-10-22T17:00:00.000Z'))).toBe('2026-10-23');
	});
});

describe('isCounted', () => {
	const start = new Date('2026-10-22T17:10:00.000Z');

	it('counts a word the learner has never met', () => {
		expect(isCounted(null, start, 1)).toBe(true);
	});

	it('counts a practice late on day 1 and a test just after midnight', () => {
		const practiced = new Date('2026-10-22T16:30:00.000Z');
		expect(vnDayKey(practiced)).toBe('2026-10-22');
		expect(vnDayKey(start)).toBe('2026-10-23');
		expect(isCounted(practiced, start, 1)).toBe(true);
	});

	it('does not count two attempts on the same Vietnam day', () => {
		const morning = new Date('2026-10-23T01:00:00.000Z');
		const evening = new Date('2026-10-23T15:00:00.000Z');
		expect(vnDayKey(morning)).toBe(vnDayKey(evening));
		expect(isCounted(morning, evening, 1)).toBe(false);
	});

	it('requires two calendar days when minGapDays is 2', () => {
		const yesterday = new Date('2026-10-22T02:00:00.000Z');
		expect(isCounted(yesterday, start, 2)).toBe(false);
		const twoDays = new Date('2026-10-20T17:30:00.000Z');
		expect(isCounted(twoDays, start, 2)).toBe(true);
	});
});
