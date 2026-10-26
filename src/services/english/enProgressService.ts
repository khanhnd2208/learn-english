import { prisma } from '@/lib/prisma';
import {
	masteredSeries,
	recallMedianByWeek,
	retentionRate,
	studySecondsByWeek,
	type CountedWordResult,
	type RecallTiming,
	type StudySpan,
} from '@/lib/english/progressMetrics';

export async function getEnglishProgress(userId: string, now = new Date()) {
	const [results, recalls, practices, tests] = await Promise.all([
		prisma.enTestWordResult.findMany({
			where: { userId, counted: true },
			orderBy: { createdAt: 'asc' },
			select: { senseId: true, passed: true, createdAt: true },
		}),
		prisma.enTestItem.findMany({
			where: {
				role: 'recall',
				correct: true,
				responseMs: { not: null },
				attempt: { userId, status: 'finished' },
			},
			select: { responseMs: true, answeredAt: true, attempt: { select: { finishedAt: true } } },
		}),
		prisma.enPracticeSession.findMany({
			where: { userId, endedAt: { not: null } },
			select: { startedAt: true, activeSeconds: true },
		}),
		prisma.enTestAttempt.findMany({
			where: { userId, status: 'finished', finishedAt: { not: null } },
			select: { startedAt: true, finishedAt: true },
		}),
	]);
	const counted: CountedWordResult[] = results.map((row) => ({
		senseId: row.senseId,
		passed: row.passed,
		createdAt: row.createdAt,
	}));
	const timings: RecallTiming[] = recalls.flatMap((row) => {
		if (row.responseMs == null) return [];
		const createdAt = row.answeredAt ?? row.attempt.finishedAt;
		return createdAt ? [{ responseMs: row.responseMs, createdAt }] : [];
	});
	const spans: StudySpan[] = [
		...practices.map((row) => ({ startedAt: row.startedAt, seconds: row.activeSeconds })),
		...tests.flatMap((row) => {
			if (!row.finishedAt) return [];
			return [{ startedAt: row.startedAt, seconds: Math.max(0, Math.floor((row.finishedAt.getTime() - row.startedAt.getTime()) / 1000)) }];
		}),
	];
	const series = masteredSeries(counted, now);
	const retention = retentionRate(counted, now);
	return {
		masteredSeries: series,
		masteredNow: series.at(-1)?.mastered ?? 0,
		retention,
		recallMedianByWeek: recallMedianByWeek(timings, now),
		studySecondsByWeek: studySecondsByWeek(spans, now),
	};
}
