import { expect, test, vi } from 'vitest';
import { seedSmallWorld } from './fixtures';
import { prisma } from '@/lib/prisma';
import { computeTodayOverview, answerToday, startToday } from '@/services/english/enDailyService';
import { studiedDays } from '@/services/english/enOverviewQueries';
import { answerGuidedReview, saveStudyPosition, startGuidedReview } from '@/services/english/enGuidedReviewService';
import { getTodayOverview as legacyTodayOverview, studiedDays as legacyStudiedDays } from './legacy/daily';
import { vnDayStart } from '@/lib/english/schedule';

for (const seed of [1, 2, 3, 4, 5]) test(`overview and study-day SQL preserve legacy results, seed ${seed}`, async () => {
	const { userIds } = await seedSmallWorld(seed);
	for (const user of userIds) {
		for (const at of ['2026-10-29T05:00:00Z', '2026-10-29T16:59:59Z', '2026-10-29T17:00:00Z']) {
			const now = new Date(at);
			const actual = await computeTodayOverview(user, now);
			const legacy = await legacyTodayOverview(user, now);
			expect({ ...actual, recentLapses: [] }).toEqual({ ...legacy, recentLapses: [] });
			const ids = [...actual.recentLapses, ...legacy.recentLapses].map((row) => row.senseId);
			const rows = await prisma.enWordState.findMany({ where: { userId: user, senseId: { in: ids } } });
			const rank = (id: string) => { const row = rows.find((entry) => entry.senseId === id)!; return [row.lapses, row.lastReviewedAt?.getTime() ?? 0]; };
			// A tie at the sixth row may choose a different ID; the ranked scores must still be identical.
			expect(actual.recentLapses.map((row) => rank(row.senseId))).toEqual(legacy.recentLapses.map((row) => rank(row.senseId)));
			for (const entry of actual.recentLapses) expect(await prisma.enSense.findUnique({ where: { id: entry.senseId }, include: { word: true } })).toMatchObject({ meaningVi: entry.meaningVi, word: { lemma: entry.lemma } });
		}
		for (const day of ['2025-10-29', '2026-10-20', '2026-10-29', '2026-10-30']) expect(await studiedDays(user, vnDayStart(day))).toEqual(await legacyStudiedDays(user, vnDayStart(day)));
	}
});

test('unenrollment pauses saved due states and enrollment restores them', async () => {
	const world = await seedSmallWorld(42);
	const user = world.userIds[0]!, setId = world.setIds[0]!;
	const now = new Date('2026-10-30T10:00:00Z');
	const before = await computeTodayOverview(user, now);
	expect(before.learnedCount).toBeGreaterThan(0);
	await prisma.enEnrollment.deleteMany({ where: { userId: user, setId } });
	expect(await computeTodayOverview(user, now)).toMatchObject({ dueTotal: 0, learnedCount: 0, enrolledSets: 0 });
	await prisma.enEnrollment.create({ data: { userId: user, setId } });
	expect(await computeTodayOverview(user, now)).toEqual(before);
});

test('SRS and incorrect/empty guided answers record the Vietnam study day in their transaction', async () => {
	const { userIds, setIds } = await seedSmallWorld(7);
	const user = userIds[0]!;
	const now = new Date('2026-11-01T16:30:00Z'); // 23:30 Vietnam
	const session = await startToday(user, now);
	await answerToday(user, { sessionId: session.sessionId!, senseId: session.items[0]!.senseId, answer: '' }, new Date(now.getTime() + 4000));
	expect(await studiedDays(user, vnDayStart('2026-11-01'))).toContain('2026-11-01');
	vi.useFakeTimers({ toFake: ['Date'] });
	try {
		vi.setSystemTime(new Date('2026-11-02T16:30:00Z'));
		let guided = await startGuidedReview(user, [setIds[0]!]);
		guided = await saveStudyPosition(user, guided.id, 5);
		await answerGuidedReview(user, guided.id, guided.questions[0]!.id, '', 1);
		expect(await studiedDays(user, vnDayStart('2026-11-02'))).toContain('2026-11-02');
	} finally { vi.useRealTimers(); }
});
