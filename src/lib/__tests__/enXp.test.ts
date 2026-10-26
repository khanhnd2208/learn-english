import { describe, expect, it } from 'vitest';
import { goalTierIndex, levelFromXp, quizXpEvent, reviewXpEvents, xpForLevel, XP } from '@/lib/english/xp';
import { currentStreak, streakStats } from '@/lib/english/streak';

const review = { id: 'r1', senseId: 's1', correct: true, scheduled: true, boxBefore: 2, boxAfter: 3 };

describe('review XP', () => {
	it('pays 2 for a right answer and still 1 for an honest miss', () => {
		expect(reviewXpEvents(review, 0)).toEqual([{ sourceKey: 'review:r1', kind: 'review', xp: 2 }]);
		expect(reviewXpEvents({ ...review, correct: false, boxAfter: 1 }, 0)).toEqual([{ sourceKey: 'review:r1', kind: 'review', xp: 1 }]);
	});

	it('adds a once-per-word bonus for a new word and for reaching long-term', () => {
		expect(reviewXpEvents({ ...review, boxBefore: 0, boxAfter: 1 }, 0).map((event) => event.sourceKey)).toEqual(['review:r1', 'new:s1']);
		expect(reviewXpEvents({ ...review, boxBefore: 3, boxAfter: 4 }, 0)).toContainEqual({ sourceKey: 'longterm:s1', kind: 'longterm', xp: XP.longTerm });
		expect(reviewXpEvents({ ...review, boxBefore: 4, boxAfter: 5 }, 0).some((event) => event.kind === 'longterm')).toBe(false);
	});

	it('pays unscheduled answers 1 XP when right, up to the daily cap', () => {
		const extra = { ...review, scheduled: false };
		expect(reviewXpEvents(extra, 0)).toEqual([{ sourceKey: 'extra:r1', kind: 'extra', xp: 1 }]);
		expect(reviewXpEvents(extra, XP.extraDailyCap)).toEqual([]);
		expect(reviewXpEvents({ ...extra, correct: false }, 0)).toEqual([]);
	});
});

describe('quiz XP', () => {
	it('pays per passed item plus a bonus at 80%, keyed by kind and day', () => {
		expect(quizXpEvent('mcq', '2026-10-26', 16, 20)).toEqual({ sourceKey: 'quiz:mcq:2026-10-26', kind: 'quiz', xp: 21 });
		expect(quizXpEvent('fill', '2026-10-26', 10, 20)?.xp).toBe(10);
		expect(quizXpEvent('fill', '2026-10-26', 0, 20)).toBeNull();
	});
});

describe('levels', () => {
	it('needs 100, 150, 200 … XP per level', () => {
		expect(xpForLevel(1)).toBe(100);
		expect(xpForLevel(3)).toBe(200);
		expect(levelFromXp(0)).toMatchObject({ level: 1, intoLevel: 0, toNext: 100, title: 'Tân binh' });
		expect(levelFromXp(249)).toMatchObject({ level: 2, intoLevel: 149, toNext: 1 });
		expect(levelFromXp(250)).toMatchObject({ level: 3, intoLevel: 0 });
	});

	it('changes title every five levels', () => {
		let total = 0;
		for (let level = 1; level < 6; level += 1) total += xpForLevel(level);
		expect(levelFromXp(total)).toMatchObject({ level: 6, title: 'Lữ khách' });
	});

	it('maps a stored goal to the nearest tier', () => {
		expect(goalTierIndex(20)).toBe(0);
		expect(goalTierIndex(40)).toBe(1);
		expect(goalTierIndex(100)).toBe(3);
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
