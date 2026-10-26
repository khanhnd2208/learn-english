import { describe, expect, it } from 'vitest';
import { xpEventsForResult } from '@/lib/english/gamify/xp';
import { levelFromXp, xpToNextLevel, titleFromMastered } from '@/lib/english/gamify/level';
import { questProgress } from '@/lib/english/gamify/quest';
import { studyDaysThisWeek } from '@/lib/english/progressMetrics';

const day = (n: number) => new Date(`2026-10-${String(n).padStart(2, '0')}T05:00:00.000Z`);

describe('gamification rules', () => {
	it('awards first mastery once, then spaced retention milestones', () => {
		const first = { passed: true, counted: true, createdAt: day(1) };
		expect(xpEventsForResult([], first, [], day(1))).toEqual([{ kind: 'first_mastery', amount: 5 }]);
		const day8 = { passed: true, counted: true, createdAt: day(8) };
		expect(xpEventsForResult([first], day8, [], day(8))).toEqual([{ kind: 'hold_7d', amount: 10 }]);
	});
	it('does not award on uncounted or failed results, and counted failure resets the hold', () => {
		const first = { passed: true, counted: true, createdAt: day(1) };
		expect(xpEventsForResult([], { passed: true, counted: false, createdAt: day(8) }, [], day(8))).toEqual([]);
		const history = [first, { passed: false, counted: true, createdAt: day(5) }];
		expect(xpEventsForResult(history, { passed: true, counted: true, createdAt: day(12) }, [], day(12))).toEqual([]);
	});
	it('keeps level monotonic and titles depend on current mastery', () => {
		expect(levelFromXp(100)).toBe(2);
		expect(xpToNextLevel(100)).toBe(200);
		expect(titleFromMastered(150)).toBe('Nhà thám hiểm');
	});
	it('counts study days by Vietnam calendar week', () => {
		const now = new Date('2026-10-26T02:00:00.000Z');
		expect(studyDaysThisWeek([new Date('2026-10-25T18:00:00.000Z'), new Date('2026-10-19T02:00:00.000Z')], now)).toEqual(['2026-10-26']);
	});
	it('derives quest completion from facts', () => {
		expect(questProgress({ kind: 'study_days', target: 4, startDay: '', endDay: '' }, { masteredInSet: 0, heldWords: 0, mistakeCount: 0, studyDays: 3 })).toMatchObject({ current: 3, done: false });
	});
});
