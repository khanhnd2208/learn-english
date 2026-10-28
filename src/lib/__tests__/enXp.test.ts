import { describe, expect, it } from 'vitest';
import { DAILY_GOAL_DEFAULT, goalTierIndex, levelFromXp, pacedEnough, reviewXpEvents, xpForLevel, XP } from '@/lib/english/xp';
import { currentStreak, streakStats } from '@/lib/english/streak';

const review = { id: 'r1', senseId: 's1', correct: true, scheduled: true, boxBefore: 2, boxAfter: 3 };

describe('SRS XP', () => {
	it('pays 20 for a right answer on schedule and nothing for a miss', () => {
		expect(reviewXpEvents(review, 0, true)).toEqual([{ sourceKey: 'review:r1', kind: 'review', xp: 20 }]);
		expect(reviewXpEvents({ ...review, correct: false, boxAfter: 1 }, 0, true)).toEqual([]);
	});

	it('pays no separate bonus for a new word but 100 for reaching long-term', () => {
		expect(reviewXpEvents({ ...review, boxBefore: 0, boxAfter: 1 }, 0, true).map((event) => event.sourceKey)).toEqual(['review:r1']);
		expect(reviewXpEvents({ ...review, boxBefore: 3, boxAfter: 4 }, 0, true)).toContainEqual({ sourceKey: 'longterm:s1', kind: 'longterm', xp: 100 });
		expect(reviewXpEvents({ ...review, boxBefore: 4, boxAfter: 5 }, 0, true).some((event) => event.kind === 'longterm')).toBe(false);
	});

	it('pays nothing when the answer came too fast', () => {
		expect(reviewXpEvents({ ...review, boxBefore: 3, boxAfter: 4 }, 0, false)).toEqual([]);
		expect(reviewXpEvents({ ...review, scheduled: false }, 0, false)).toEqual([]);
	});

	it('pays unscheduled answers 10 XP when right, up to the shared 300 XP cap', () => {
		const extra = { ...review, scheduled: false };
		expect(reviewXpEvents(extra, 0, true)).toEqual([{ sourceKey: 'extra:r1', kind: 'extra', xp: 10 }]);
		expect(reviewXpEvents(extra, XP.reviewDailyCap - 10, true)).toHaveLength(1);
		expect(reviewXpEvents(extra, XP.reviewDailyCap, true)).toEqual([]);
		expect(reviewXpEvents({ ...extra, correct: false }, 0, true)).toEqual([]);
	});
});

describe('pacing', () => {
	const at = (seconds: number) => new Date(2026, 9, 26, 8, 0, seconds);

	it('needs at least 3 seconds between answers', () => {
		expect(pacedEnough(at(0), at(2))).toBe(false);
		expect(pacedEnough(at(0), at(3))).toBe(true);
	});

});

describe('levels', () => {
	it('needs 800, 1400, 2000 … XP per level', () => {
		expect(xpForLevel(1)).toBe(800);
		expect(xpForLevel(3)).toBe(2000);
		expect(levelFromXp(0)).toMatchObject({ level: 1, intoLevel: 0, toNext: 800, title: 'Tân binh' });
		expect(levelFromXp(2199)).toMatchObject({ level: 2, intoLevel: 1399, toNext: 1 });
		expect(levelFromXp(2200)).toMatchObject({ level: 3, intoLevel: 0 });
	});

	it('changes title every five levels', () => {
		let total = 0;
		for (let level = 1; level < 6; level += 1) total += xpForLevel(level);
		expect(total).toBe(10000);
		expect(levelFromXp(total)).toMatchObject({ level: 6, title: 'Lữ khách' });
	});

	it('maps a stored goal to the nearest tier', () => {
		expect(goalTierIndex(200)).toBe(0);
		expect(goalTierIndex(400)).toBe(1);
		expect(goalTierIndex(1000)).toBe(3);
		expect(goalTierIndex(DAILY_GOAL_DEFAULT)).toBe(1);
	});
});

describe('streaks', () => {
	const days = (...list: string[]) => new Set(list);

	it('does not break while today is still open', () => {
		expect(currentStreak(days('2026-10-24', '2026-10-25'), '2026-10-26')).toBe(2);
		expect(currentStreak(days('2026-10-24', '2026-10-25', '2026-10-26'), '2026-10-26')).toBe(3);
	});

	it('forgives one missed day per week without counting it', () => {
		// Thu 22, Fri 23 studied; Sat 24 missed; Sun 25 studied.
		expect(currentStreak(days('2026-10-22', '2026-10-23', '2026-10-25'), '2026-10-26')).toBe(3);
	});

	it('breaks on a second missed day in the same week or two days in a row', () => {
		expect(currentStreak(days('2026-10-20', '2026-10-22', '2026-10-24', '2026-10-25'), '2026-10-26')).toBe(2);
		expect(currentStreak(days('2026-10-21', '2026-10-24'), '2026-10-25')).toBe(1);
	});

	it('remembers the longest run', () => {
		expect(streakStats(days('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-20'), '2026-10-21')).toEqual({ current: 1, longest: 4 });
	});
});
