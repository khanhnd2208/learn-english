import { describe, expect, it } from 'vitest';
import { correctBox, restoredSchedule } from '@/lib/english/appeal';
import { dueAt } from '@/lib/english/schedule';

const at = new Date('2026-10-28T05:00:00Z');
const later = new Date('2026-10-30T05:00:00Z');

describe('restoredSchedule', () => {
	it('gives back exactly what a correct answer would have scheduled when untouched since', () => {
		// box 3 answered wrong → box 2, one more lapse
		const result = restoredSchedule({ at, boxBefore: 3, scheduled: true }, { box: 2, lapses: 1, dueAt: dueAt(2, at), lastReviewedAt: at }, later);
		expect(result).toEqual({ box: 4, lapses: 0, dueAt: dueAt(4, at) });
	});
	it('treats a new word as known on the first try, without touching lapses', () => {
		expect(correctBox(0)).toBe(2);
		expect(restoredSchedule({ at, boxBefore: 0, scheduled: true }, { box: 1, lapses: 0, dueAt: dueAt(1, at), lastReviewedAt: at }, later)).toEqual({ box: 2, lapses: 0, dueAt: dueAt(2, at) });
	});
	it('lifts a lower box after a later review, but never lowers a higher one', () => {
		const lifted = restoredSchedule({ at, boxBefore: 3, scheduled: true }, { box: 2, lapses: 1, dueAt: dueAt(2, later), lastReviewedAt: later }, later);
		expect(lifted).toEqual({ box: 4, lapses: 0, dueAt: dueAt(4, later) });
		const kept = restoredSchedule({ at, boxBefore: 1, scheduled: true }, { box: 4, lapses: 1, dueAt: dueAt(4, later), lastReviewedAt: later }, later);
		expect(kept).toEqual({ box: 4, lapses: 0, dueAt: dueAt(4, later) });
	});
	it('changes nothing when the answer did not move the schedule', () => {
		expect(restoredSchedule({ at, boxBefore: 3, scheduled: false }, { box: 3, lapses: 0, dueAt: later, lastReviewedAt: null }, later)).toBeNull();
		expect(restoredSchedule({ at, boxBefore: 3, scheduled: true }, null, later)).toBeNull();
	});
});
