import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { shiftVnDay, vnDayKey } from '@/lib/english/gapRule';
import { vnDayStart } from '@/lib/english/schedule';

/** Shared live-word scope: paused sets and hidden senses never enter the SRS queue. */
export function liveCte(userId: string) {
	return Prisma.sql`WITH live AS (
		SELECT DISTINCT i."senseId" FROM "EnEnrollment" e
		JOIN "EnSet" st ON st."id" = e."setId" AND st."status" = 'published'
		JOIN "EnSetItem" i ON i."setId" = e."setId"
		JOIN "EnSense" se ON se."id" = i."senseId" AND se."status" = 'published'
		WHERE e."userId" = ${userId}
	), sched AS (
		SELECT ws.* FROM "EnWordState" ws JOIN live ON live."senseId" = ws."senseId"
		WHERE ws."userId" = ${userId} AND ws."box" > 0
	)`;
}

export type OverviewCounts = { liveCount: number; learnedCount: number; dueTotal: number; lapsedDue: number; longTermCount: number; rememberingCount: number; tomorrowCount: number; newCount: number; enrolledSets: number; dueNext7Days: Array<{ day: string; count: number }> };

export async function overviewCounts(userId: string, now: Date): Promise<OverviewCounts> {
	const today = vnDayKey(now);
	const week = Array.from({ length: 7 }, (_, n) => shiftVnDay(today, n));
	const dueColumns = week.map((day, n) => Prisma.sql`count(*) FILTER (WHERE ${n === 0 ? Prisma.sql`"dueAt" < ${vnDayStart(shiftVnDay(day, 1))}` : Prisma.sql`"dueAt" >= ${vnDayStart(day)} AND "dueAt" < ${vnDayStart(shiftVnDay(day, 1))}`})::int AS ${Prisma.raw(`"due${n}"`)}`);
	const [row] = await prisma.$queryRaw<Array<Omit<OverviewCounts, 'newCount' | 'dueNext7Days'> & Record<string, number>>>(Prisma.sql`${liveCte(userId)}
		SELECT (SELECT count(*)::int FROM live) AS "liveCount", count(*)::int AS "learnedCount",
		count(*) FILTER (WHERE "dueAt" <= ${now})::int AS "dueTotal",
		count(*) FILTER (WHERE "lapses" > 0 AND "dueAt" <= ${now})::int AS "lapsedDue",
		count(*) FILTER (WHERE "box" >= 4)::int AS "longTermCount",
		count(*) FILTER (WHERE "box" >= 2 AND "box" < 4)::int AS "rememberingCount",
		count(*) FILTER (WHERE "dueAt" > ${now} AND "dueAt" < ${vnDayStart(shiftVnDay(today, 2))})::int AS "tomorrowCount",
		(SELECT count(*)::int FROM "EnEnrollment" e JOIN "EnSet" st ON st."id" = e."setId" AND st."status" = 'published' WHERE e."userId" = ${userId}) AS "enrolledSets",
		${Prisma.join(dueColumns)} FROM sched`);
	if (!row) throw new Error('Missing overview aggregate');
	return { liveCount: row.liveCount, learnedCount: row.learnedCount, dueTotal: row.dueTotal, lapsedDue: row.lapsedDue, longTermCount: row.longTermCount, rememberingCount: row.rememberingCount, tomorrowCount: row.tomorrowCount, enrolledSets: row.enrolledSets, newCount: row.liveCount - row.learnedCount, dueNext7Days: week.map((day, n) => ({ day, count: row[`due${n}`]! })) };
}

export async function studiedDays(userId: string, from: Date): Promise<Set<string>> {
	const rows = await prisma.enStudyDay.findMany({ where: { userId, day: { gte: vnDayKey(from) } }, select: { day: true } });
	return new Set(rows.map((row) => row.day));
}

export async function recentReviewStats(userId: string, today: string) {
	const [row] = await prisma.$queryRaw<Array<{ reviewedToday: number; scheduledTotal: number; scheduledCorrect: number }>>`
		SELECT count(*) FILTER (WHERE "at" >= ${vnDayStart(today)} AND "at" < ${vnDayStart(shiftVnDay(today, 1))})::int AS "reviewedToday",
		count(*) FILTER (WHERE "scheduled" AND "boxBefore" > 0)::int AS "scheduledTotal",
		count(*) FILTER (WHERE "scheduled" AND "boxBefore" > 0 AND "correct")::int AS "scheduledCorrect"
		FROM "EnReview" WHERE "userId" = ${userId} AND "at" >= ${vnDayStart(shiftVnDay(today, -29))}`;
	return row!;
}

export async function recentLapseIds(userId: string): Promise<string[]> {
	const rows = await prisma.$queryRaw<Array<{ senseId: string }>>(Prisma.sql`${liveCte(userId)}
		SELECT "senseId" FROM sched WHERE "lapses" > 0 AND "box" <= 2
		ORDER BY "lapses" DESC, "lastReviewedAt" DESC NULLS LAST, "senseId" ASC LIMIT 6`);
	return rows.map((row) => row.senseId);
}
