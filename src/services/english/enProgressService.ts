import { prisma } from '@/lib/prisma';
import {
	masteredSeries,
	recallMedianByWeek,
	retentionRate,
	studySecondsByWeek,
	studyDaysThisWeek,
	type CountedWordResult,
	type RecallTiming,
	type StudySpan,
} from '@/lib/english/progressMetrics';
import { levelFromXp, xpIntoLevel, xpToNextLevel, titleFromMastered } from '@/lib/english/gamify/level';
import { vnDayKey } from '@/lib/english/gapRule';

export async function getEnglishProgress(userId: string, now = new Date()) {
	const dayStart = new Date(`${vnDayKey(now)}T00:00:00+07:00`);
	const dayEnd = new Date(dayStart.getTime() + 86_400_000);
	const [results, recalls, practices, tests, profile, xpEvents, attempts, todayExposure, allEvents, rescueEvents, activityItems, rewards, quests, countedAttemptRows] = await Promise.all([
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
			select: { attemptId: true, senseId: true, activityKey: true, responseMs: true, answeredAt: true, attempt: { select: { finishedAt: true } } },
		}),
		prisma.enPracticeSession.findMany({
			where: { userId, endedAt: { not: null } },
			select: { startedAt: true, activeSeconds: true, senseIds: true },
		}),
		prisma.enTestAttempt.findMany({
			where: { userId, status: 'finished', finishedAt: { not: null } },
			select: { startedAt: true, finishedAt: true },
		}),
		prisma.enLearnerProfile.findUnique({ where: { userId } }),
		prisma.enXpEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100, select: { amount: true, kind: true, senseId: true, createdAt: true } }),
		prisma.enTestAttempt.findMany({ where: { userId, status: 'finished', finishedAt: { not: null } }, select: { finishedAt: true } }),
		prisma.enWordState.count({ where: { userId, lastExposureAt: { gte: dayStart, lt: dayEnd } } }),
		prisma.enXpEvent.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { senseId: true, kind: true, createdAt: true } }),
		prisma.enTestWordResult.findMany({ where: { userId, counted: true, passed: true }, orderBy: { createdAt: 'asc' }, select: { senseId: true, createdAt: true } }),
		prisma.enTestItem.findMany({ where: { attempt: { userId, status: 'finished', startedAt: { gte: new Date(now.getTime() - 90 * 86_400_000) }, words: { some: { counted: true } } }, activityKey: { in: ['meaning_choice', 'cloze_choice', 'listen_choice', 'listen_type', 'recall_type'] } }, select: { senseId: true, activityKey: true, correct: true, attemptId: true } }),
		prisma.enReward.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
		prisma.enQuest.findMany({ where: { userId, status: 'active' }, select: { id: true } }),
		prisma.enTestWordResult.findMany({ where: { userId, counted: true }, select: { attemptId: true, senseId: true } }),
	]);
	const counted: CountedWordResult[] = results.map((row) => ({
		senseId: row.senseId,
		passed: row.passed,
		createdAt: row.createdAt,
	}));
	const countedAttemptSenses = new Set(countedAttemptRows.map((row) => `${row.attemptId}:${row.senseId}`));
	const timings: RecallTiming[] = recalls.filter((row) => row.activityKey === 'recall_type' && countedAttemptSenses.has(`${row.attemptId}:${row.senseId}`)).flatMap((row) => {
		if (row.responseMs == null) return [];
		const createdAt = row.answeredAt ?? row.attempt.finishedAt;
		return createdAt ? [{ responseMs: row.responseMs, createdAt }] : [];
	});
	const spans: StudySpan[] = [
		...practices.map((row) => ({ startedAt: row.startedAt, seconds: row.activeSeconds, senseCount: row.senseIds.length })),
		...tests.flatMap((row) => {
			if (!row.finishedAt) return [];
			return [{ startedAt: row.startedAt, seconds: Math.max(0, Math.floor((row.finishedAt.getTime() - row.startedAt.getTime()) / 1000)) }];
		}),
	];
	const series = masteredSeries(counted, now);
	const retention = retentionRate(counted, now);
	const countedItems = activityItems.filter((item) => countedAttemptSenses.has(`${item.attemptId}:${item.senseId}`));
	const totalXp = profile?.totalXp ?? 0;
	const level = levelFromXp(totalXp);
	const studyDays = studyDaysThisWeek([
		...attempts.flatMap((row) => row.finishedAt ? [row.finishedAt] : []),
		...practices.filter((row) => row.activeSeconds >= 300 && row.senseIds.length > 0).map((row) => row.startedAt),
	], now);
	return {
		masteredSeries: series,
		masteredNow: series.at(-1)?.mastered ?? 0,
		retention,
		recallMedianByWeek: recallMedianByWeek(timings, now),
		studySecondsByWeek: studySecondsByWeek(spans, now),
		totalXp,
		weeklyDaysGoal: profile?.weeklyDaysGoal ?? 4,
		xpEvents,
		level,
		xpIntoLevel: xpIntoLevel(totalXp),
		xpToNext: xpToNextLevel(totalXp),
		xpProgress: xpIntoLevel(totalXp),
		title: titleFromMastered(series.at(-1)?.mastered ?? 0),
		studyDays,
		exposedToday: todayExposure,
		heldCount: new Set(allEvents.filter((event) => event.kind === 'hold_7d' || event.kind === 'hold_30d').map((event) => event.senseId)).size,
		rescuedCount: new Set([...(profile?.rescuedSenses ?? []), ...rescueEvents.filter((event) => {
			const failedEarlier = counted.some((row) => row.senseId === event.senseId && !row.passed && row.createdAt < event.createdAt);
			return failedEarlier;
		}).map((event) => event.senseId)]).size,
		rewards,
		activeQuestCount: quests.length,
		stats: {
			meaning: countedItems.filter((item) => item.activityKey === 'meaning_choice' || item.activityKey === 'cloze_choice'),
			listening: countedItems.filter((item) => item.activityKey === 'listen_choice' || item.activityKey === 'listen_type'),
			writing: countedItems.filter((item) => item.activityKey === 'recall_type'),
		},
	};
}
