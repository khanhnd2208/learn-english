import { describe, expect, it, vi } from 'vitest';
import { emptyMetrics } from '@/lib/english/quests';
import { pendingRewards, setDailyGoal } from '@/services/english/enGoalService';

const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { enLearnerProfile: { upsert: mocks.upsert } } }));
vi.mock('@/services/english/enDailyService', () => ({ getTodayOverview: vi.fn() }));

const lifetime = { longTerm: 0, learned: 0, longestStreak: 0, goalDays: 0, chests: 0, revived: 0, sessionsFinished: 0, enrolledSets: 0 };
const base = {
	today: '2026-10-26',
	weekStart: '2026-10-26',
	dailyGoalXp: 400,
	daily: [{ key: 'srs_words' as const, target: 20, xp: 100 }, { key: 'chunk_done' as const, target: 0, xp: 0 }],
	weekly: [{ key: 'week_days' as const, target: 4, xp: 0 }],
	dayMetrics: { ...emptyMetrics(), xp: 320, srsWords: 20 },
	weekMetrics: { ...emptyMetrics(), xp: 320, srsWords: 100, daysStudied: 4 },
	claimed: new Set<string>(),
	lifetime,
	achievements: [] as Array<{ key: string; seenAt: Date | null }>,
};

describe('pending goal rewards', () => {
	it('lets a quest bonus finish the XP goal, and opens the chest once the weekly quest is done', () => {
		const result = pendingRewards(base);
		expect(result.xp.map((event) => event.sourceKey)).toEqual([
			'quest:daily:2026-10-26:srs_words',
			'quest:daily:2026-10-26:daily_goal',
			'chest:2026-10-26',
			'ach:perfect_week_1',
		]);
		expect(result.xp.find((event) => event.sourceKey.endsWith('daily_goal'))).toMatchObject({ kind: 'goal', xp: 100 });
		expect(result.quests.map((quest) => quest.title)).toContain('Mở rương tuần');
		expect(result.xp.find((event) => event.kind === 'chest')?.xp).toBe(500);
	});

	it('keeps the chest closed until the weekly quest is done', () => {
		const result = pendingRewards({ ...base, weekMetrics: { ...emptyMetrics(), daysStudied: 3 } });
		expect(result.xp.some((event) => event.kind === 'chest')).toBe(false);
	});

	it('pays the goal from day XP alone, and not before it is reached', () => {
		expect(pendingRewards({ ...base, dayMetrics: { ...emptyMetrics(), xp: 399 }, weekMetrics: emptyMetrics() }).xp).toEqual([]);
		const reached = pendingRewards({ ...base, dayMetrics: { ...emptyMetrics(), xp: 400 }, weekMetrics: emptyMetrics() });
		expect(reached.xp).toEqual([{ sourceKey: 'quest:daily:2026-10-26:daily_goal', kind: 'goal', xp: 100 }]);
	});

	it('never pays a quest with nothing to do', () => {
		const result = pendingRewards({ ...base, dayMetrics: emptyMetrics(), weekMetrics: emptyMetrics(), daily: [{ key: 'chunk_done' as const, target: 0, xp: 0 }, { key: 'srs_words' as const, target: 0, xp: 0 }] });
		expect(result.xp).toEqual([]);
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
		await expect(setDailyGoal('u1', 550)).rejects.toThrow('Mục tiêu ngày không hợp lệ');
		mocks.upsert.mockResolvedValue({});
		await expect(setDailyGoal('u1', 700)).resolves.toEqual({ dailyXpGoal: 700 });
		expect(mocks.upsert.mock.calls[0]?.[0].update.dailyXpGoal).toBe(700);
	});
});
