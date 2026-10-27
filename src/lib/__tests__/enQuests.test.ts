import { describe, expect, it } from 'vitest';
import { dailyQuests, emptyMetrics, parseQuests, questProgress, timeLeftLabel, topUpQuests, weeklyQuests, type QuestContext } from '@/lib/english/quests';
import { periodMetrics } from '@/lib/english/goalMetrics';
import { achievementStatus, newlyEarned, nearestAchievements, type LifetimeMetrics } from '@/lib/english/achievements';

const ctx: QuestContext = { tier: 1, weeklyDaysGoal: 4, srsAvailable: 30, enrolledSets: 2 };

describe('daily quests', () => {
	it('are the same three quests every day, in order', () => {
		const quests = dailyQuests(ctx);
		expect(quests.map((quest) => [quest.key, quest.target, quest.xp])).toEqual([['srs_words', 20, 100], ['review_correct', 20, 100], ['quiz_done', 1, 100]]);
		expect(dailyQuests(ctx)).toEqual(quests);
	});

	it('scales with the goal tier', () => {
		const targets = (tier: number) => dailyQuests({ ...ctx, tier, srsAvailable: 100 }).map((quest) => quest.target);
		expect(targets(0)).toEqual([10, 10, 1]);
		expect(targets(1)).toEqual([20, 20, 1]);
		expect(targets(2)).toEqual([30, 30, 1]);
		expect(targets(3)).toEqual([40, 30, 1]);
	});

	it('shrinks the SRS target to the words available, down to a free zero', () => {
		expect(dailyQuests({ ...ctx, srsAvailable: 7 })[0]).toMatchObject({ key: 'srs_words', target: 7, xp: 100 });
		const none = dailyQuests({ ...ctx, srsAvailable: 0 })[0]!;
		expect(none).toEqual({ key: 'srs_words', target: 0, xp: 0 });
		expect(questProgress(none, emptyMetrics()).done).toBe(true);
	});

	it('gives free zero quests when no set is downloaded', () => {
		expect(dailyQuests({ ...ctx, enrolledSets: 0, srsAvailable: 0 }).map((quest) => [quest.target, quest.xp])).toEqual([[0, 0], [0, 0], [0, 0]]);
	});
});

describe('weekly quests', () => {
	it('use the weekly days goal and five days of the daily SRS and Review targets', () => {
		expect(weeklyQuests(ctx).map((quest) => [quest.key, quest.target, quest.xp])).toEqual([['week_days', 4, 400], ['week_srs', 100, 400], ['week_review', 100, 400]]);
		expect(weeklyQuests({ ...ctx, tier: 3, weeklyDaysGoal: 9 }).map((quest) => quest.target)).toEqual([7, 200, 150]);
	});
});

describe('quest progress', () => {
	it('reads each key from its own metric and caps at the target', () => {
		const metrics = { ...emptyMetrics(), srsWords: 25, reviewCorrect: 4, quizzesDone: 1, daysStudied: 2 };
		expect(questProgress({ key: 'srs_words', target: 20, xp: 100 }, metrics)).toEqual({ current: 20, done: true });
		expect(questProgress({ key: 'review_correct', target: 10, xp: 100 }, metrics)).toEqual({ current: 4, done: false });
		expect(questProgress({ key: 'quiz_done', target: 1, xp: 100 }, metrics)).toEqual({ current: 1, done: true });
		expect(questProgress({ key: 'week_days', target: 4, xp: 400 }, metrics)).toEqual({ current: 2, done: false });
		expect(questProgress({ key: 'week_srs', target: 100, xp: 400 }, metrics).current).toBe(25);
		expect(questProgress({ key: 'week_review', target: 100, xp: 400 }, metrics).current).toBe(4);
	});

	it('drops retired quests from stored JSON', () => {
		expect(parseQuests([{ key: 'srs_words', target: 20, xp: 100 }, { key: 'daily_goal', target: 40, xp: 10 }, null])).toEqual([{ key: 'srs_words', target: 20, xp: 100 }]);
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

	it('counts scheduled SRS answers, correct Review answers, quizzes and study days', () => {
		const metrics = periodMetrics({
			days: new Set(['2026-10-26']),
			reviews: [
				{ at: at('08:00:00'), scheduled: true },
				{ at: at('08:01:00'), scheduled: true },
				{ at: at('08:02:00'), scheduled: false },
				{ at: at('08:00:00', '25'), scheduled: true },
			],
			guided: [
				{ answeredAt: at('09:00:00'), correct: true },
				{ answeredAt: at('09:00:05'), correct: false },
				{ answeredAt: at('09:00:10'), correct: true },
				{ answeredAt: at('09:00:10', '25'), correct: true },
			],
			xp: [{ day: '2026-10-26', xp: 120, kind: 'review', sourceKey: 'a' }, { day: '2026-10-25', xp: 990, kind: 'review', sourceKey: 'c' }],
			quizzes: [{ kind: 'mcq', passedCount: 5, wordCount: 20, finishedAt: at('10:00:00') }, { kind: 'fill', passedCount: 0, wordCount: 0, finishedAt: at('10:00:00', '25') }],
		});
		expect(metrics).toEqual({ xp: 120, srsWords: 2, reviewCorrect: 2, quizzesDone: 1, daysStudied: 1 });
	});

	it('counts a day with only Review as studied', () => {
		const metrics = periodMetrics({ days: new Set(['2026-10-26', '2026-10-27']), reviews: [{ at: at('08:00:00'), scheduled: true }], guided: [{ answeredAt: at('09:00:00', '27'), correct: false }], xp: [], quizzes: [] });
		expect(metrics.daysStudied).toBe(2);
	});
});

describe('achievements', () => {
	const metrics: LifetimeMetrics = { longTerm: 12, learned: 30, longestStreak: 2, goalDays: 0, chests: 0, perfectQuizzes: 0, revived: 0, sessionsFinished: 1, enrolledSets: 1, quizKindsToday: 0 };

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
		expect(topUpQuests(empty, fresh).map((quest) => [quest.key, quest.target])).toEqual([['srs_words', 5], ['review_correct', 20], ['quiz_done', 1]]);
		expect(topUpQuests(empty.slice(0, 1), fresh).map((quest) => quest.key)).toEqual(['srs_words', 'review_correct', 'quiz_done']);
	});

	it('leaves a shown quest alone', () => {
		const shown = dailyQuests(ctx);
		expect(topUpQuests(shown, dailyQuests({ ...ctx, tier: 3 }))).toEqual(shown);
	});
});
