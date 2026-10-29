import { describe, expect, it } from 'vitest';
import { buildDailyQueue, countStages, interleaveNewWords, dueAt, intervalChange, isDue, isNearMiss, nextBox, scheduleAnswer, scheduleMove, stageOf } from '@/lib/english/schedule';

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

	it('orders due reviews by box then overdue date and pauses new words above backlog threshold', () => {
		const queue = buildDailyQueue([
			state('s2', 2, '2026-10-20T00:00:00Z'),
			state('s1', 1, '2026-10-25T00:00:00Z'),
		], ['n1', 'n2'], { now, dueBacklogLimit: 1 });
		expect(queue.map((item) => item.kind === 'review' ? item.state.senseId : item.senseId)).toEqual(['s1', 's2']);
	});

	it('caps a round of reviews', () => {
		const states = Array.from({ length: 40 }, (_, index) => state(`s${index}`, 2, '2026-10-20T00:00:00Z'));
		expect(buildDailyQueue(states, [], { now, dueLimit: 30, dueBacklogLimit: 100 })).toHaveLength(30);
	});

	it('limits new words per day and excludes existing or duplicate senses', () => {
		expect(buildDailyQueue([], ['n1', 'n1', 'n2', 'n3'], { now, newWordsPerDay: 2 })).toEqual([{ kind: 'new', senseId: 'n1' }, { kind: 'new', senseId: 'n2' }]);
		expect(buildDailyQueue([], ['n1', 'n2', 'n3'], { now, newWordsPerDay: 2, introducedToday: 1 })).toEqual([{ kind: 'new', senseId: 'n1' }]);
		expect(buildDailyQueue([], ['n1'], { now, newWordsPerDay: 2, introducedToday: 5 })).toEqual([]);
	});

	it('takes new words from each set in turn, skipping scheduled and shared words', () => {
		expect(interleaveNewWords([['a1', 'a2', 'a3', 'shared'], ['b1', 'shared'], []], ['a1'])).toEqual(['a2', 'b1', 'a3', 'shared']);
		expect(interleaveNewWords([['a1'], ['b1']], ['a1', 'b1'])).toEqual([]);
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
