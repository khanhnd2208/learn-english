import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/english/activities';
import { pickSessionWords, countStages, dueAt, intervalChange, isDue, isNearMiss, nextBox, scheduleAnswer, scheduleMove, stageOf } from '@/lib/english/schedule';

describe('Leitner schedule', () => {
	const now = new Date('2026-10-26T10:00:00+07:00');
	const state = (senseId: string, box: number, due: string) => ({ id: senseId, senseId, box, dueAt: new Date(due), lapses: 0, introducedAt: now, lastReviewedAt: null });

	it('promotes correct recalls and resets lapses to box 1', () => {
		expect(nextBox(0, true)).toBe(1);
		expect(nextBox(3, true)).toBe(4);
		expect(nextBox(5, true)).toBe(5);
		 expect(nextBox(4, false)).toBe(3);
	});

	it('places new words at box 2 when known and box 1 when missed', () => {
		expect(scheduleAnswer(null, false)).toEqual({ box: 1, lapses: 0 });
		expect(scheduleAnswer({ box: 0, lapses: 0 }, true)).toEqual({ box: 2, lapses: 0 });
		expect(scheduleAnswer({ box: 0, lapses: 0 }, false)).toEqual({ box: 1, lapses: 0 });
		expect(scheduleAnswer({ box: 3, lapses: 1 }, false)).toEqual({ box: 2, lapses: 2 });
		expect(scheduleAnswer({ box: 3, lapses: 1 }, true)).toEqual({ box: 4, lapses: 1 });
	});

	it('does not move a word before its due date', () => {
		const early = state('early', 3, '2026-11-10T00:00:00Z');
		expect(scheduleMove(early, false, now)).toEqual({ box: 3, lapses: 0, dueAt: early.dueAt, scheduled: false });
		expect(scheduleMove(early, true, now)).toEqual({ box: 3, lapses: 0, dueAt: early.dueAt, scheduled: false });
	});

	it('moves due words down one level and new words onto a schedule', () => {
		const reset = scheduleMove(state('due', 4, '2026-10-25T17:00:00Z'), false, now);
		expect(reset).toMatchObject({ box: 3, lapses: 1, scheduled: true });
		expect(scheduleMove(reset, false, now)).toMatchObject({ box: 3, lapses: 1, scheduled: false });
		const freshWrong = scheduleMove(null, false, now);
		expect(freshWrong).toMatchObject({ box: 1, lapses: 0, scheduled: true });
		const freshCorrect = scheduleMove(null, true, now);
		expect(freshCorrect).toMatchObject({ box: 2, lapses: 0, scheduled: true });
	});

	it('describes interval changes for the UI', () => {
		expect(intervalChange(3, 4)).toEqual({ fromDays: 7, toDays: 21, direction: 'up' });
		expect(intervalChange(4, 3)).toEqual({ fromDays: 21, toDays: 7, direction: 'down' });
		expect(intervalChange(1, 1)).toEqual({ fromDays: 1, toDays: 1, direction: 'same' });
	});

	it('makes words due from 00:00 Vietnam time on the due day', () => {
		expect(dueAt(0, now).toISOString()).toBe('2026-10-25T17:00:00.000Z');
		expect(dueAt(1, now).toISOString()).toBe('2026-10-26T17:00:00.000Z');
		expect(dueAt(4, now).toISOString()).toBe('2026-11-15T17:00:00.000Z');
		const earlyMorning = new Date('2026-10-27T06:00:00+07:00');
		expect(isDue({ dueAt: dueAt(1, now) }, earlyMorning)).toBe(true);
		expect(isDue({ dueAt: dueAt(1, now) }, now)).toBe(false);
	});

	it.each([[40, 3000, 50, 30], [10, 3000, 50, 10], [0, 3000, 50, 0], [100, 0, 50, 50], [3, 4, 7, 3]])('selects a bounded round from %i due and %i new words', (due, fresh, total, minDue) => {
		const states = Array.from({ length: due }, (_, i) => state(`d${i}`, 1 + i % 5, '2026-10-20T00:00:00Z'));
		const newIds = Array.from({ length: fresh }, (_, i) => `n${i}`);
		const queue = pickSessionWords([...states, ...states], [...newIds, ...newIds, ...states.map((s) => s.senseId)], mulberry32(42));
		expect(queue).toHaveLength(total);
		expect(queue.filter((item) => item.kind === 'review').length).toBeGreaterThanOrEqual(minDue);
		const ids = queue.map((item) => item.kind === 'review' ? item.state.senseId : item.senseId);
		expect(new Set(ids).size).toBe(total);
		const boxes = queue.map((item) => item.kind === 'review' ? item.state.box : Infinity);
		expect(boxes).toEqual([...boxes].sort((a,b) => a - b));
	});

	it('samples the whole population evenly with no reserved share', () => {
		const first = state('d', 1, '2026-10-20T00:00:00Z');
		let dueHits = 0;
		for (let seed = 0; seed < 10_000; seed++) if (pickSessionWords([first], ['n'], mulberry32(seed), 1, 0)[0]?.kind === 'review') dueHits++;
		expect(dueHits / 10_000).toBeCloseTo(0.5, 1);
	});

	it('names learning stages without box jargon', () => {
		expect([0, 1, 2, 3, 4, 5].map(stageOf)).toEqual(['new', 'learning', 'remembering', 'remembering', 'long_term', 'long_term']);
		expect(countStages([undefined, 0, 1, 2, 3, 4, 5])).toEqual({ new: 2, learning: 1, remembering: 2, longTerm: 2 });
		expect(countStages([])).toEqual({ new: 0, learning: 0, remembering: 0, longTerm: 0 });
	});
});

describe('near-miss typos', () => {
	it('gives one fix for a single typo and two for long words', () => {
		expect(isNearMiss('recieve', ['receive'])).toBe(true);
		expect(isNearMiss('acomodation', ['accommodation'])).toBe(true);
		expect(isNearMiss('Receive', ['receive'])).toBe(false);
	});

	it('does not rescue unrelated or very short answers', () => {
		expect(isNearMiss('cat', ['car'])).toBe(false);
		expect(isNearMiss('table', ['receive'])).toBe(false);
		expect(isNearMiss('', ['receive'])).toBe(false);
	});
});
