import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	xpGroupBy: vi.fn(),
	reviewGroupBy: vi.fn(),
	profileFindMany: vi.fn(),
	mongoToArray: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		enXpEvent: { groupBy: mocks.xpGroupBy },
		enReview: { groupBy: mocks.reviewGroupBy },
		enLearnerProfile: { findMany: mocks.profileFindMany },
	},
}));

vi.mock('@/lib/mongodbClient', () => ({
	mongoClientPromise: Promise.resolve({
		db: () => ({ collection: () => ({ find: () => ({ toArray: mocks.mongoToArray }) }) }),
	}),
}));

import { getLeaderboard } from '@/services/english/enLeaderboardService';

type ScoreGroup = { userId: string; _sum: { xp: number | null } };
type ActivityGroup = { userId: string; _max: { at: Date | null } };

const id = (value: number) => value.toString(16).padStart(24, '0');
const scores = (...xp: number[]): ScoreGroup[] => xp.map((value, index) => ({ userId: id(index + 1), _sum: { xp: value } }));

function configure({
	scoreGroups = [],
	totalGroups = scoreGroups,
	xpActivity = [],
	reviewActivity = [],
}: {
	scoreGroups?: ScoreGroup[];
	totalGroups?: ScoreGroup[];
	xpActivity?: ActivityGroup[];
	reviewActivity?: ActivityGroup[];
} = {}) {
	mocks.xpGroupBy.mockImplementation((args: { _max?: { at: boolean }; where?: { userId?: unknown } }) => {
		if (args._max) return Promise.resolve(xpActivity);
		if (args.where?.userId) return Promise.resolve(totalGroups);
		return Promise.resolve(scoreGroups);
	});
	mocks.reviewGroupBy.mockResolvedValue(reviewActivity);
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.profileFindMany.mockResolvedValue([]);
	mocks.mongoToArray.mockResolvedValue([]);
	configure();
});

describe('getLeaderboard', () => {
	it('uses the Monday-first Vietnam week across the UTC boundary', async () => {
		await getLeaderboard(id(1), 'week', new Date('2026-10-29T17:00:00.000Z'));
		let scoreCall = mocks.xpGroupBy.mock.calls.find(([args]) => args._sum && !args.where?.userId)?.[0];
		expect(scoreCall.where.day.in).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);

		vi.clearAllMocks();
		mocks.profileFindMany.mockResolvedValue([]);
		mocks.mongoToArray.mockResolvedValue([]);
		configure();
		await getLeaderboard(id(1), 'week', new Date('2026-10-25T16:59:59.000Z'));
		scoreCall = mocks.xpGroupBy.mock.calls.find(([args]) => args._sum && !args.where?.userId)?.[0];
		expect(scoreCall.where.day.in).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
	});

	it('returns the top rows and marks the current learner', async () => {
		configure({ scoreGroups: scores(300, 200, 100), totalGroups: scores(300, 200, 100) });
		const result = await getLeaderboard(id(2), 'week');
		expect(result.rows).toHaveLength(3);
		expect(result.rows[1]?.me).toBe(true);
		expect(result.me.rank).toBe(2);
	});

	it('keeps the current learner outside the top 50 as a separate row', async () => {
		const allScores = scores(...Array.from({ length: 55 }, (_, index) => 550 - index * 10));
		configure({ scoreGroups: allScores, totalGroups: allScores });
		const result = await getLeaderboard(id(53), 'week');
		expect(result.rows).toHaveLength(50);
		expect(result.me.rank).toBe(53);
		expect(result.rows.some((row) => row.me)).toBe(false);
	});

	it('returns a null rank and zero XP when the learner has no score in the period', async () => {
		configure({ scoreGroups: scores(300, 200), totalGroups: [...scores(300, 200), { userId: id(9), _sum: { xp: 900 } }] });
		const result = await getLeaderboard(id(9), 'week');
		expect(result.me).toMatchObject({ userId: id(9), rank: null, xp: 0, me: true });
	});

	it('merges XP and review activity for the ten-minute live window', async () => {
		const now = new Date('2026-10-30T10:00:00.000Z');
		configure({
			scoreGroups: scores(300, 200, 100),
			totalGroups: scores(300, 200, 100),
			xpActivity: [{ userId: id(1), _max: { at: new Date(now.getTime() - 5 * 60_000) } }],
			reviewActivity: [
				{ userId: id(2), _max: { at: new Date(now.getTime() - 9 * 60_000) } },
				{ userId: id(3), _max: { at: new Date(now.getTime() - 11 * 60_000) } },
			],
		});
		const result = await getLeaderboard(id(1), 'week', now);
		expect(result.activeNow).toBe(2);
		expect(result.rows.map((row) => row.active)).toEqual([true, true, false]);
	});

	it('falls back to learner names when Mongo lookup fails', async () => {
		configure({ scoreGroups: scores(100), totalGroups: scores(100) });
		mocks.mongoToArray.mockRejectedValue(new Error('offline'));
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const result = await getLeaderboard(id(1), 'week');
		expect(result.rows[0]?.name).toBe('Học viên');
		expect(error).toHaveBeenCalledWith('[leaderboard] user lookup failed', expect.any(Error));
		error.mockRestore();
	});

	it('reuses all-time scores for levels and never exposes email', async () => {
		configure({ scoreGroups: scores(100, 50) });
		const result = await getLeaderboard(id(1), 'all');
		const sumCalls = mocks.xpGroupBy.mock.calls.filter(([args]) => args._sum);
		expect(sumCalls).toHaveLength(1);
		expect(sumCalls[0]?.[0].where).toEqual({});
		expect(JSON.stringify(result)).not.toContain('"email"');
	});
});
