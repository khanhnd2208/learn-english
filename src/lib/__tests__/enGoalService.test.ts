import { describe, expect, it, vi } from 'vitest';
import { emptyMetrics } from '@/lib/english/quests';
import { pendingRewards, setDailyGoal } from '@/services/english/enGoalService';

const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enLearnerProfile: { upsert: mocks.upsert } } }));
vi.mock('@/services/english/enDailyService', () => ({ getTodayOverview: vi.fn() }));

const lifetime = { longTerm: 0, learned: 0, longestStreak: 0, goalDays: 0, chests: 0, perfectQuizzes: 0, revived: 0, sessionsFinished: 0, enrolledSets: 0, quizKindsToday: 0 };
const base = {
	today: '2026-10-26',
	weekStart: '2026-10-26',
	daily: [{ key: 'daily_goal' as const, target: 40, xp: 10 }, { key: 'new_words' as const, target: 5, xp: 10 }],
	weekly: [{ key: 'week_xp' as const, target: 50, xp: 40 }],
	dayMetrics: { ...emptyMetrics(), xp: 32, newWords: 5 },
	weekMetrics: { ...emptyMetrics(), xp: 32, newWords: 5 },
	claimed: new Set<string>(),
	lifetime,
	achievements: [] as Array<{ key: string; seenAt: Date | null }>,
};

describe('pending goal rewards', () => {
	it('lets a quest bonus finish the XP goal, the weekly quest and the chest in one pass', () => {
		const result = pendingRewards(base);
		expect(result.xp.map((event) => event.sourceKey)).toEqual([
			'quest:daily:2026-10-26:new_words',
			'quest:daily:2026-10-26:daily_goal',
			'quest:weekly:2026-10-26:week_xp',
			'chest:2026-10-26',
			'ach:perfect_week_1',
		]);
		expect(result.xp.find((event) => event.sourceKey.endsWith('daily_goal'))?.kind).toBe('goal');
		expect(result.quests.map((quest) => quest.title)).toContain('Mở rương tuần');
	});

	it('pays nothing twice', () => {
		const first = pendingRewards(base);
		const again = pendingRewards({ ...base, claimed: new Set(first.xp.map((event) => event.sourceKey)) });
		expect(again.xp).toEqual([]);
	});

	it('unlocks achievements once, counting a goal and a chest earned in the same pass', () => {
		const result = pendingRewards({ ...base, lifetime: { ...lifetime, goalDays: 4, sessionsFinished: 1 }, achievements: [{ key: 'first_step_1', seenAt: null }] });
		expect(result.achievements).toEqual(['on_time_1', 'perfect_week_1']);
	});
});

describe('daily goal', () => {
	it('accepts only the four tiers', async () => {
		await expect(setDailyGoal('u1', 55)).rejects.toThrow('Mục tiêu ngày không hợp lệ');
		mocks.upsert.mockResolvedValue({});
		await expect(setDailyGoal('u1', 70)).resolves.toEqual({ dailyXpGoal: 70 });
		expect(mocks.upsert.mock.calls[0]?.[0].update.dailyXpGoal).toBe(70);
	});
});
