import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	const tx = {
		enReview: { findFirst: vi.fn(), create: vi.fn() },
		enWordState: { upsert: vi.fn() },
		enXpEvent: { aggregate: vi.fn(), createMany: vi.fn(), createManyAndReturn: vi.fn() },
		enGuidedReviewQuestion: { findFirst: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
		enGuidedReviewSession: { update: vi.fn() },
	};
	return {
		tx,
		prisma: {
			$transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
			enPracticeSession: { findFirst: vi.fn() },
			enWordState: { findUnique: vi.fn() },
			enGuidedReviewSession: { findFirst: vi.fn(), findUnique: vi.fn() },
			enGuidedReviewQuestion: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
		},
		bundles: vi.fn(),
	};
});

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: mocks.bundles }));
vi.mock('@/lib/english/activities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/english/activities')>()),
	activityByKey: () => ({ grade: () => true }),
}));

import { answerToday } from '@/services/english/enDailyService';
import { answerGuidedReview } from '@/services/english/enGuidedReviewService';

const startedAt = new Date('2026-10-26T08:00:00+07:00');
const after = (seconds: number) => new Date(startedAt.getTime() + seconds * 1000);

describe('SRS pacing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.prisma.enPracticeSession.findFirst.mockResolvedValue({ id: 'p1', senseIds: ['s1'], endedAt: null, startedAt });
		mocks.bundles.mockResolvedValue([{ word: { lemma: 'apple', forms: ['apple'] }, examples: [] }]);
		mocks.prisma.enWordState.findUnique.mockResolvedValue({ box: 1, lapses: 0, dueAt: new Date(startedAt.getTime() - 1000), introducedAt: startedAt });
		mocks.tx.enReview.create.mockImplementation(async ({ data }) => ({ id: 'r1', ...data }));
		mocks.tx.enXpEvent.createManyAndReturn.mockImplementation(async ({ data }) => data.map((row: { xp: number }) => ({ xp: row.xp })));
	});

	it('pays 20 XP for a right answer 3 seconds after the session started', async () => {
		mocks.tx.enReview.findFirst.mockResolvedValue(null);
		const result = await answerToday('u1', { sessionId: 'p1', senseId: 's1', answer: 'apple' }, after(3));
		expect(result.xp).toBe(20);
	});

	it('pays nothing when it comes under 3 seconds after the previous answer', async () => {
		mocks.tx.enReview.findFirst.mockResolvedValue({ at: after(10) });
		const result = await answerToday('u1', { sessionId: 'p1', senseId: 's1', answer: 'apple' }, after(12));
		expect(result.xp).toBe(0);
		expect(mocks.tx.enXpEvent.createManyAndReturn).not.toHaveBeenCalled();
	});

	it('pays nothing for a wrong answer', async () => {
		mocks.tx.enReview.findFirst.mockResolvedValue(null);
		const result = await answerToday('u1', { sessionId: 'p1', senseId: 's1', answer: 'xyz', giveUp: true }, after(30));
		expect(result.xp).toBe(0);
	});
});

describe('Review pacing and cap', () => {
	const session = { id: 'g1', userId: 'u1', phase: 'quiz', chunkNumber: 1, studyPosition: 0, questionPosition: 0, selectedSetIds: [], poolSenseIds: [], remainingSenseIds: [], currentChunkSenseIds: [], startedAt, endedAt: null };
	const question = { id: 'q1', sessionId: 'g1', chunkNumber: 1, kind: 'main', answer: null, activityKey: 'recall_type', role: 'main', senseId: 's1', prompt: {}, answerKey: 'apple', accepted: [], layout: null, position: 0, correct: null };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mocks.prisma.enGuidedReviewSession.findFirst.mockResolvedValue(session);
		mocks.prisma.enGuidedReviewSession.findUnique.mockResolvedValue(session);
		mocks.prisma.enGuidedReviewQuestion.findFirst.mockResolvedValue(question);
		mocks.prisma.enGuidedReviewQuestion.findMany.mockResolvedValue([]);
		mocks.bundles.mockResolvedValue([]);
		mocks.tx.enGuidedReviewQuestion.updateMany.mockResolvedValue({ count: 1 });
		mocks.tx.enGuidedReviewQuestion.count.mockResolvedValue(1);
		mocks.tx.enXpEvent.createMany.mockResolvedValue({ count: 1 });
		mocks.tx.enXpEvent.aggregate.mockResolvedValue({ _sum: { xp: 0 } });
	});

	it('pays 10 XP for a right answer that is paced', async () => {
		vi.setSystemTime(after(5));
		mocks.tx.enGuidedReviewQuestion.findFirst.mockResolvedValue({ answeredAt: after(1) });
		const result = await answerGuidedReview('u1', 'g1', 'q1', 'apple', 100);
		expect(result.xp).toBe(10);
	});

	it('pays nothing under 3 seconds, whatever responseMs the client sends', async () => {
		vi.setSystemTime(after(5));
		mocks.tx.enGuidedReviewQuestion.findFirst.mockResolvedValue({ answeredAt: after(3) });
		const result = await answerGuidedReview('u1', 'g1', 'q1', 'apple', 60_000);
		expect(result.xp).toBe(0);
		expect(mocks.tx.enXpEvent.createMany).not.toHaveBeenCalled();
	});

	it('measures the first answer from the session start', async () => {
		vi.setSystemTime(after(2));
		mocks.tx.enGuidedReviewQuestion.findFirst.mockResolvedValue(null);
		expect((await answerGuidedReview('u1', 'g1', 'q1', 'apple', 100)).xp).toBe(0);
	});

	it('stops at the 300 XP daily cap', async () => {
		vi.setSystemTime(after(5));
		mocks.tx.enGuidedReviewQuestion.findFirst.mockResolvedValue(null);
		mocks.tx.enXpEvent.aggregate.mockResolvedValue({ _sum: { xp: 300 } });
		expect((await answerGuidedReview('u1', 'g1', 'q1', 'apple', 100)).xp).toBe(0);
		mocks.tx.enXpEvent.aggregate.mockResolvedValue({ _sum: { xp: 290 } });
		expect((await answerGuidedReview('u1', 'g1', 'q1', 'apple', 100)).xp).toBe(10);
	});
});
