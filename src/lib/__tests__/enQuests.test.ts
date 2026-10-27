import { describe, expect, it } from 'vitest';
import { dailyCandidates, emptyMetrics, parseQuests, pickDailyQuests, questProgress, QUEST_META, timeLeftLabel, weeklyQuests, type QuestContext } from '@/lib/english/quests';
import { bestCombo, periodMetrics } from '@/lib/english/goalMetrics';
import { achievementStatus, newlyEarned, nearestAchievements, type LifetimeMetrics } from '@/lib/english/achievements';

const ctx: QuestContext = { tier: 1, dailyGoalXp: 40, weeklyDaysGoal: 4, learnedCount: 30, newAvailable: 10, dueTotal: 20, lapsedDue: 4, enrolledSets: 2, rememberingCount: 6, practiceAvailable: 20 };

describe('daily quests', () => {
	it('always starts with the daily goal and picks the same quests for the same seed', () => {
		const first = pickDailyQuests('u1:2026-10-26', ctx);
		expect(first).toHaveLength(3);
		expect(first[0]).toMatchObject({ key: 'daily_goal', target: 40 });
		expect(pickDailyQuests('u1:2026-10-26', ctx)).toEqual(first);
		expect(new Set(first.map((quest) => quest.key)).size).toBe(3);
	});

	it('never gives two quiz quests on one day', () => {
		for (let day = 1; day <= 30; day += 1) {
			const quests = pickDailyQuests(`u1:2026-10-${day}`, ctx);
			expect(quests.filter((quest) => QUEST_META[quest.key].action === 'quiz').length).toBeLessThanOrEqual(1);
		}
	});

	it('only offers quests that can be finished today', () => {
		const keys = dailyCandidates({ ...ctx, practiceAvailable: 0, newAvailable: 0, dueTotal: 0, lapsedDue: 0, enrolledSets: 0 }).map((quest) => quest.key);
		expect(keys).toEqual([]);
		expect(pickDailyQuests('seed', { ...ctx, practiceAvailable: 0, newAvailable: 0, dueTotal: 0, lapsedDue: 0, enrolledSets: 0 })).toHaveLength(1);
		const capped = dailyCandidates({ ...ctx, practiceAvailable: 2 }).find((quest) => quest.key === 'correct_reviews');
		expect(capped?.target).toBe(2);
	});

	it('scales targets with the goal tier', () => {
		const light = dailyCandidates({ ...ctx, tier: 0 }).find((quest) => quest.key === 'correct_reviews');
		const warrior = dailyCandidates({ ...ctx, tier: 3 }).find((quest) => quest.key === 'correct_reviews');
		expect(light?.target).toBe(8);
		expect(warrior?.target).toBe(20);
	});
});

describe('weekly quests', () => {
	it('uses the weekly days goal and falls back when nothing can reach long-term', () => {
		expect(weeklyQuests(ctx).map((quest) => [quest.key, quest.target])).toEqual([['week_days', 4], ['week_xp', 160], ['week_goal_days', 3]]);
		expect(weeklyQuests({ ...ctx, rememberingCount: 0 })[2]).toMatchObject({ key: 'week_goal_days', target: 3 });
	});
});

describe('quest progress', () => {
	it('caps progress at the target and counts clear_due from what is left', () => {
		const metrics = { ...emptyMetrics(), xp: 55, dueRemaining: 3 };
		expect(questProgress({ key: 'daily_goal', target: 40, xp: 10 }, metrics)).toEqual({ current: 40, done: true });
		expect(questProgress({ key: 'clear_due', target: 10, xp: 10 }, metrics)).toEqual({ current: 7, done: false });
	});

	it('drops unknown quests from stored JSON', () => {
		expect(parseQuests([{ key: 'daily_goal', target: 40, xp: 10 }, { key: 'nope', target: 1, xp: 1 }, null])).toEqual([{ key: 'daily_goal', target: 40, xp: 10 }]);
	});

	it('formats time left', () => {
		const now = new Date('2026-10-26T10:00:00Z');
		expect(timeLeftLabel('2026-10-26T10:30:00Z', now)).toBe('30 phút');
		expect(timeLeftLabel('2026-10-26T15:00:00Z', now)).toBe('5 giờ');
		expect(timeLeftLabel('2026-10-29T10:00:00Z', now)).toBe('3 ngày');
	});
});

describe('period metrics', () => {
	const at = (time: string) => new Date(`2026-10-26T${time}+07:00`);
	const row = (sessionId: string, senseId: string, time: string, correct: boolean, boxBefore = 1, boxAfter = 2, scheduled = true) => ({ sessionId, senseId, at: at(time), correct, scheduled, boxBefore, boxAfter });

	it('counts combos inside one session only', () => {
		expect(bestCombo([row('a', 's1', '08:00:00', true), row('b', 's2', '08:00:01', true), row('a', 's3', '08:00:02', true), row('a', 's4', '08:00:03', false)])).toBe(2);
	});

	it('reads reviews, XP and quizzes for the chosen days', () => {
		const metrics = periodMetrics({
			days: new Set(['2026-10-26']),
			reviews: [
				row('a', 'new1', '08:00:00', true, 0, 1),
				row('a', 'old1', '08:01:00', true, 1, 2),
				row('a', 'old2', '08:02:00', true, 3, 4),
				row('a', 'old1', '08:03:00', true, 2, 2, false),
				{ ...row('a', 'y', '08:00:00', true), at: new Date('2026-10-25T10:00:00+07:00') },
			],
			xp: [{ day: '2026-10-26', xp: 12, kind: 'review', sourceKey: 'a' }, { day: '2026-10-26', xp: 10, kind: 'goal', sourceKey: 'b' }, { day: '2026-10-25', xp: 99, kind: 'review', sourceKey: 'c' }],
			quizzes: [{ kind: 'mcq', passedCount: 15, wordCount: 20, finishedAt: at('09:00:00') }, { kind: 'mcq', passedCount: 5, wordCount: 20, finishedAt: at('09:10:00') }],
			lapsedSenses: new Set(['old1']),
			dueRemaining: 2,
		});
		expect(metrics).toEqual({ xp: 22, correctReviews: 2, newWords: 1, rescued: 1, bestCombo: 4, dueRemaining: 2, quizzesPassed: 1, quizKinds: 1, daysStudied: 1, goalDays: 1, longTermGained: 1 });
	});
});

describe('achievements', () => {
	const metrics: LifetimeMetrics = { longTerm: 12, learned: 30, longestStreak: 2, goalDays: 0, chests: 0, perfectQuizzes: 0, revived: 0, sessionsFinished: 1, enrolledSets: 1, quizKindsToday: 0 };

	it('unlocks each reached tier once', () => {
		const earned = newlyEarned(metrics, new Set(['first_step_1']));
		expect(earned.map((entry) => entry.key)).toEqual(['memory_vault_1', 'explorer_1']);
		expect(earned[0]?.xp).toBe(20);
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

describe('topping up a short board', () => {
	it('keeps shown quests and fills free slots without a second quiz quest', async () => {
		const { topUpQuests } = await import('@/lib/english/quests');
		const goal = { key: 'daily_goal' as const, target: 40, xp: 10 };
		const quiz = { key: 'quiz_any' as const, target: 1, xp: 10 };
		const fresh = [goal, { key: 'quiz_kinds' as const, target: 2, xp: 10 }, { key: 'new_words' as const, target: 5, xp: 10 }];
		expect(topUpQuests([goal, quiz], fresh).map((quest) => quest.key)).toEqual(['daily_goal', 'quiz_any', 'new_words']);
		const full = [goal, quiz, { key: 'combo' as const, target: 8, xp: 10 }];
		expect(topUpQuests(full, fresh)).toBe(full);
	});
});
