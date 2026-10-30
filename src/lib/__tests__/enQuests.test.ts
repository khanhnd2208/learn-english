import { describe, expect, it } from 'vitest';
import { dailyQuests, emptyMetrics, isIdleQuest, todayQuestCount, parseQuests, questProgress, timeLeftLabel, topUpQuests, weeklyQuests, type QuestContext } from '@/lib/english/quests';
import { mergeDayTotals, metricsFromDayTotals, periodMetrics } from '@/lib/english/goalMetrics';
import { achievementStatus, newlyEarned, nearestAchievements, type LifetimeMetrics } from '@/lib/english/achievements';

const ctx: QuestContext = { tier: 1, weeklyDaysGoal: 4, srsAvailable: 30, enrolledSets: 2 };

describe('day totals', () => {
	const totals = mergeDayTotals(
		[{ day: '2026-10-26', reviewed: 3, srsWords: 2 }],
		[{ kind: 'answer', day: '2026-10-26', n: 3 }, { kind: 'chunk', day: '2026-10-26', n: 1 }],
		[{ day: '2026-10-26', xp: 120 }, { day: '2026-10-25', xp: 990 }],
	);

	it('merges and sorts the three daily SQL results', () => {
		expect(totals).toEqual([
			{ day: '2026-10-25', srsWords: 0, reviewed: 0, guidedAnswered: 0, chunksDone: 0, xp: 990 },
			{ day: '2026-10-26', srsWords: 2, reviewed: 3, guidedAnswered: 3, chunksDone: 1, xp: 120 },
		]);
	});

	it('counts SRS, chunks, XP and studied days for a selected day', () => {
		expect(metricsFromDayTotals(new Set(['2026-10-26']), totals)).toEqual({ xp: 120, srsWords: 2, chunksDone: 1, daysStudied: 1 });
	});

	it('does not count an XP-only day as studied', () => {
		expect(metricsFromDayTotals(new Set(['2026-10-25']), [{ day: '2026-10-25', srsWords: 0, reviewed: 0, guidedAnswered: 0, chunksDone: 0, xp: 50 }])).toEqual({ xp: 50, srsWords: 0, chunksDone: 0, daysStudied: 0 });
	});

	it('counts a day with only Review as studied', () => {
		expect(metricsFromDayTotals(new Set(['2026-10-26', '2026-10-27']), [
			{ day: '2026-10-26', srsWords: 1, reviewed: 1, guidedAnswered: 0, chunksDone: 0, xp: 0 },
			{ day: '2026-10-27', srsWords: 0, reviewed: 0, guidedAnswered: 1, chunksDone: 0, xp: 0 },
		]).daysStudied).toBe(2);
	});

	it('returns empty metrics for empty input', () => {
		expect(metricsFromDayTotals(new Set(['2026-10-26']), mergeDayTotals([], [], []))).toEqual(emptyMetrics());
	});
});

describe('daily quests', () => {
	it('are the same two quests every day, in order', () => {
		const quests = dailyQuests(ctx);
		expect(quests.map((quest) => [quest.key, quest.target, quest.xp])).toEqual([['srs_words', 20, 100], ['chunk_done', 2, 100]]);
		expect(dailyQuests(ctx)).toEqual(quests);
	});

	it('scales with the goal tier', () => {
		const targets = (tier: number) => dailyQuests({ ...ctx, tier, srsAvailable: 100 }).map((quest) => quest.target);
		expect(targets(0)).toEqual([10, 1]);
		expect(targets(1)).toEqual([20, 2]);
		expect(targets(2)).toEqual([30, 3]);
		expect(targets(3)).toEqual([40, 4]);
	});

	it('shrinks the SRS target to the words available, down to a free zero', () => {
		expect(dailyQuests({ ...ctx, srsAvailable: 7 })[0]).toMatchObject({ key: 'srs_words', target: 7, xp: 100 });
		const none = dailyQuests({ ...ctx, srsAvailable: 0 })[0]!;
		expect(none).toEqual({ key: 'srs_words', target: 0, xp: 0 });
		expect(questProgress(none, emptyMetrics()).done).toBe(true);
	});

	it('gives free zero quests when no set is downloaded', () => {
		expect(dailyQuests({ ...ctx, enrolledSets: 0, srsAvailable: 0 }).map((quest) => [quest.target, quest.xp])).toEqual([[0, 0], [0, 0]]);
	});
});

describe('weekly quests', () => {
	it('is one study-days quest that pays through the chest', () => {
		expect(weeklyQuests(ctx)).toEqual([{ key: 'week_days', target: 4, xp: 0 }]);
		expect(weeklyQuests({ ...ctx, tier: 3, weeklyDaysGoal: 9 }).map((quest) => quest.target)).toEqual([7]);
	});
});

describe('quest progress', () => {
	it('reads each key from its own metric and caps at the target', () => {
		const metrics = { ...emptyMetrics(), srsWords: 25, chunksDone: 1, daysStudied: 2 };
		expect(questProgress({ key: 'srs_words', target: 20, xp: 100 }, metrics)).toEqual({ current: 20, done: true });
		expect(questProgress({ key: 'chunk_done', target: 2, xp: 100 }, metrics)).toEqual({ current: 1, done: false });
		expect(questProgress({ key: 'week_days', target: 4, xp: 0 }, metrics)).toEqual({ current: 2, done: false });
	});

	it('drops retired quests from stored JSON', () => {
		expect(parseQuests([{ key: 'srs_words', target: 20, xp: 100 }, { key: 'review_correct', target: 20, xp: 100 }, { key: 'week_srs', target: 100, xp: 400 }, null])).toEqual([{ key: 'srs_words', target: 20, xp: 100 }]);
	});

	it('formats time left', () => {
		const now = new Date('2026-10-26T10:00:00Z');
		expect(timeLeftLabel('2026-10-26T10:30:00Z', now)).toBe('30 phút');
		expect(timeLeftLabel('2026-10-26T15:00:00Z', now)).toBe('5 giờ');
		expect(timeLeftLabel('2026-10-29T10:00:00Z', now)).toBe('3 ngày');
	});
});

describe('period metrics', () => {
	const at = (time: string, day = '26') => new Date(`2026-10-${day}T${time}+07:00`);

	it('counts scheduled SRS answers, finished chunks and study days', () => {
		const metrics = periodMetrics({
			days: new Set(['2026-10-26']),
			reviews: [
				{ at: at('08:00:00'), scheduled: true },
				{ at: at('08:01:00'), scheduled: true },
				{ at: at('08:02:00'), scheduled: false },
				{ at: at('08:00:00', '25'), scheduled: true },
			],
			guided: [
				{ sessionId: 's', chunkNumber: 1, answered: true, answeredAt: at('09:00:00'), correct: true },
				{ sessionId: 's', chunkNumber: 1, answered: true, answeredAt: at('09:00:05'), correct: false },
				{ sessionId: 's', chunkNumber: 1, answered: true, answeredAt: at('09:00:10'), correct: true },
				{ sessionId: 'old', chunkNumber: 1, answered: true, answeredAt: at('09:00:10', '25'), correct: true },
			],
			xp: [{ day: '2026-10-26', xp: 120, kind: 'review', sourceKey: 'a' }, { day: '2026-10-25', xp: 990, kind: 'review', sourceKey: 'c' }],
		});
		expect(metrics).toEqual({ xp: 120, srsWords: 2, chunksDone: 1, daysStudied: 1 });
	});

	it('counts complete chunks on the day of their final answer', () => {
 const rows = [
 { sessionId: 'a', chunkNumber: 1, answered: true, answeredAt: at('23:59:00', '25'), correct: true },
 { sessionId: 'a', chunkNumber: 1, answered: true, answeredAt: at('09:00:00'), correct: false },
 { sessionId: 'a', chunkNumber: 2, answered: true, answeredAt: at('10:00:00'), correct: true },
 { sessionId: 'a', chunkNumber: 2, answered: false, answeredAt: null, correct: false },
 ];
 const base = { reviews: [], guided: rows, xp: [] };
 expect(periodMetrics({ ...base, days: new Set(['2026-10-25']) }).chunksDone).toBe(0);
 expect(periodMetrics({ ...base, days: new Set(['2026-10-26']) }).chunksDone).toBe(1);
 });
	it('counts a day with only Review as studied', () => {
		const metrics = periodMetrics({ days: new Set(['2026-10-26', '2026-10-27']), reviews: [{ at: at('08:00:00'), scheduled: true }], guided: [{ sessionId: 's', chunkNumber: 1, answered: true, answeredAt: at('09:00:00', '27'), correct: false }], xp: [] });
		expect(metrics.daysStudied).toBe(2);
	});
});

describe('achievements', () => {
	const metrics: LifetimeMetrics = { longTerm: 12, learned: 30, longestStreak: 2, goalDays: 0, chests: 0, revived: 0, sessionsFinished: 1, enrolledSets: 1 };

	it('unlocks each reached tier once, paying ten times the old XP', () => {
		const earned = newlyEarned(metrics, new Set(['first_step_1']));
		expect(earned.map((entry) => entry.key)).toEqual(['memory_vault_1', 'explorer_1']);
		expect(earned[0]?.xp).toBe(200);
	});

	it('keeps an unlocked badge when its metric drops and shows the next tier', () => {
		const status = achievementStatus({ ...metrics, longTerm: 8 }, new Set(['memory_vault_1'])).find((entry) => entry.def.id === 'memory_vault');
		expect(status).toMatchObject({ reached: 1, current: 8, next: 50 });
	});

	it('lists the closest locked achievements first', () => {
		const nearest = nearestAchievements(achievementStatus({ ...metrics, longestStreak: 2 }));
		expect(nearest[0]?.def.id).toBe('flame');
	});
});

describe('topping up a board', () => {
	it('upgrades empty quests once there is something to do and adds missing ones', () => {
		const fresh = dailyQuests(ctx);
		const empty = dailyQuests({ ...ctx, enrolledSets: 0, srsAvailable: 5 });
		expect(topUpQuests(empty, fresh).map((quest) => [quest.key, quest.target])).toEqual([['srs_words', 5], ['chunk_done', 2]]);
		expect(topUpQuests(empty.slice(0, 1), fresh).map((quest) => quest.key)).toEqual(['srs_words', 'chunk_done']);
	});

	it('leaves a shown quest alone', () => {
		const shown = dailyQuests(ctx);
		expect(topUpQuests(shown, dailyQuests({ ...ctx, tier: 3 }))).toEqual(shown);
	});
});

describe('today quest count', () => {
	it('skips idle quests and counts the daily XP goal', () => {
		const quests = [{ target: 0, done: true }, { target: 2, done: true }, { target: 10, done: false }];
		expect(isIdleQuest(quests[0]!)).toBe(true);
		expect(todayQuestCount(quests, 40, 50)).toEqual({ done: 1, total: 3 });
		expect(todayQuestCount(quests, 50, 50)).toEqual({ done: 2, total: 3 });
		expect(todayQuestCount([{ target: 0, done: true }], 0, 50)).toEqual({ done: 0, total: 1 });
	});
});
