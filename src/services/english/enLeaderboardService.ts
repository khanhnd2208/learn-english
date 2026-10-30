import { ObjectId } from 'mongodb';
import { mongoClientPromise } from '@/lib/mongodbClient';
import { prisma } from '@/lib/prisma';
import { isUserId } from '@/lib/english/avatar';
import { vnDayKey, vnWeekDays } from '@/lib/english/gapRule';
import {
	ACTIVE_WINDOW_MS,
	LEADERBOARD_SIZE,
	avatarUrl,
	displayName,
	isActive,
	rankScores,
	type LeaderboardPeriod,
	type RankedScore,
} from '@/lib/english/leaderboard';
import { levelFromXp } from '@/lib/english/xp';

export type LeaderboardRow = {
	userId: string;
	rank: number | null;
	name: string;
	avatarUrl: string | null;
	xp: number;
	level: number;
	active: boolean;
	me: boolean;
};

export type Leaderboard = {
	period: LeaderboardPeriod;
	rows: LeaderboardRow[];
	me: LeaderboardRow;
	players: number;
	activeNow: number;
};

type UserCard = { name: string | null; image: string | null };

async function loadUserCards(ids: string[]): Promise<Map<string, UserCard>> {
	try {
		const objectIds = ids.filter(isUserId).map((id) => new ObjectId(id));
		if (!objectIds.length) return new Map();
		const client = await mongoClientPromise;
		const users = await client.db().collection<{ _id: ObjectId; name?: string | null; image?: string | null }>('users').find(
			{ _id: { $in: objectIds } },
			{ projection: { name: 1, image: 1 } },
		).toArray();
		return new Map(users.map((user) => [user._id.toHexString(), { name: user.name ?? null, image: user.image ?? null }]));
	} catch (error) {
		console.error('[leaderboard] user lookup failed', error);
		return new Map();
	}
}

export async function getLeaderboard(userId: string, period: LeaderboardPeriod, now = new Date()): Promise<Leaderboard> {
	const where = period === 'week' ? { day: { in: vnWeekDays(vnDayKey(now)) } } : {};
	const scoreGroups = await prisma.enXpEvent.groupBy({ by: ['userId'], where, _sum: { xp: true } });
	const ranked = rankScores(scoreGroups.map((entry) => ({ userId: entry.userId, xp: entry._sum.xp ?? 0 })));
	const players = ranked.length;
	const top = ranked.slice(0, LEADERBOARD_SIZE);
	const mine: RankedScore | { userId: string; xp: number; rank: null } = ranked.find((entry) => entry.userId === userId) ?? { userId, xp: 0, rank: null };
	const ids = [...new Set([...top.map((entry) => entry.userId), userId])];
	const since = new Date(now.getTime() - ACTIVE_WINDOW_MS);

	const [totalGroups, profiles, xpActivity, reviewActivity, cards] = await Promise.all([
		period === 'all'
			? Promise.resolve(ranked)
			: prisma.enXpEvent.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _sum: { xp: true } }),
		prisma.enLearnerProfile.findMany({
			where: { userId: { in: ids } },
			select: { userId: true, avatarFile: true, avatarVersion: true },
		}),
		prisma.enXpEvent.groupBy({ by: ['userId'], where: { at: { gte: since } }, _max: { at: true } }),
		prisma.enReview.groupBy({ by: ['userId'], where: { at: { gte: since } }, _max: { at: true } }),
		loadUserCards(ids),
	]);

	const totalXp = new Map(totalGroups.map((entry) => [entry.userId, '_sum' in entry ? entry._sum.xp ?? 0 : entry.xp]));
	const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
	const lastAt = new Map<string, Date>();
	for (const entry of [...xpActivity, ...reviewActivity]) {
		const at = entry._max.at;
		if (at && (!lastAt.has(entry.userId) || at > lastAt.get(entry.userId)!)) lastAt.set(entry.userId, at);
	}
	const activeNow = [...lastAt.values()].filter((at) => isActive(at, now)).length;

	function row(score: RankedScore | { userId: string; xp: number; rank: null }): LeaderboardRow {
		const profile = profileByUser.get(score.userId);
		const card = cards.get(score.userId);
		return {
			userId: score.userId,
			rank: score.rank,
			name: displayName(card?.name),
			avatarUrl: avatarUrl(score.userId, profile ? { file: profile.avatarFile, version: profile.avatarVersion } : null, card?.image),
			xp: score.xp,
			level: levelFromXp(totalXp.get(score.userId) ?? 0).level,
			active: isActive(lastAt.get(score.userId) ?? null, now),
			me: score.userId === userId,
		};
	}

	return { period, rows: top.map(row), me: row(mine), players, activeNow };
}
