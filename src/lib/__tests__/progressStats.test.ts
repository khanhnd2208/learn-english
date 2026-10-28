import { describe, expect, it } from 'vitest';
import { accuracySeries, shortDayLabel, weekDelta, weekXpSummary } from '@/lib/english/progressStats';

describe('progress stats', () => {
	it('rounds weekly accuracy and leaves empty weeks as null', () => {
		expect(accuracySeries([
			{ start: '2026-10-19', longTerm: 0, answers: 0, correct: 0 },
			{ start: '2026-10-26', longTerm: 3, answers: 3, correct: 2 },
		])).toEqual([
			{ start: '2026-10-19', percent: null, correct: 0, answers: 0 },
			{ start: '2026-10-26', percent: 67, correct: 2, answers: 3 },
		]);
	});

	it('only compares weeks that both have data', () => {
		expect(weekDelta(80, 70)).toBe(10);
		expect(weekDelta(80, null)).toBeNull();
		expect(weekDelta(null, 70)).toBeNull();
	});

	it('sums the week and counts studied and goal days', () => {
		const day = (xp: number, studied: boolean, goalMet: boolean) => ({ day: '2026-10-26', xp, studied, goalMet, isFuture: false });
		expect(weekXpSummary([day(120, true, true), day(30, true, false), day(0, false, false)])).toEqual({ total: 150, studiedDays: 2, goalDays: 1, best: 120 });
		expect(weekXpSummary([]).best).toBe(0);
	});

	it('formats a Vietnam day key as d/M', () => {
		expect(shortDayLabel('2026-10-26')).toBe('26/10');
		expect(shortDayLabel('2026-09-07')).toBe('7/9');
	});
});
