import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { wordPassed } from '@/lib/english/wordState';
import { finishEnglishTest } from '@/services/english/enTestService';

const harness = vi.hoisted(() => ({
	create: vi.fn(),
	update: vi.fn(),
}));

describe('word scoring', () => {
	it('passes only when both items are correct and treats a blank as wrong', () => {
		expect(wordPassed(true, true)).toBe(true);
		expect(wordPassed(true, false)).toBe(false);
		expect(wordPassed(false, true)).toBe(false);
	});
});

const finished = {
	id: 'attempt-1',
	userId: 'user-a',
	status: 'finished' as const,
	passedCount: 1,
	wordCount: 1,
	blueprint: {},
	items: [],
	words: [{
		id: 'wr-1',
		attemptId: 'attempt-1',
		userId: 'user-a',
		senseId: 'sense-1',
		passed: true,
		counted: false,
		priorExposureAt: null,
		recallMs: null,
		createdAt: new Date('2026-10-22T00:00:00.000Z'),
	}],
};

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn((fn: (tx: {
			enTestAttempt: {
				findFirst: () => Promise<typeof finished>;
				update: typeof harness.update;
			};
			enTestItem: { update: ReturnType<typeof vi.fn> };
			enTestWordResult: { create: typeof harness.create };
			enWordState: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
		}) => Promise<unknown>) => fn({
			enTestAttempt: {
				findFirst: vi.fn(async () => finished),
				update: harness.update,
			},
			enTestItem: { update: vi.fn() },
			enTestWordResult: { create: harness.create },
			enWordState: { findUnique: vi.fn(), upsert: vi.fn() },
		})),
		enSense: {
			findMany: vi.fn(async () => [{ id: 'sense-1', meaningVi: 'mượn', word: { lemma: 'borrow' } }]),
		},
	},
}));

describe('finishEnglishTest', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses the extended transaction timeout and max wait', async () => {
		await finishEnglishTest('user-a', 'attempt-1');
		expect(prisma.$transaction).toHaveBeenCalledWith(
			expect.any(Function),
			{ timeout: 30_000, maxWait: 10_000 },
		);
	});

	it('returns the stored result when finish is called again', async () => {
		const first = await finishEnglishTest('user-a', 'attempt-1');
		const second = await finishEnglishTest('user-a', 'attempt-1');
		expect(first).toEqual(second);
		expect(first.passedCount).toBe(1);
		expect(first.words[0]?.counted).toBe(false);
		expect(harness.create).not.toHaveBeenCalled();
		expect(harness.update).not.toHaveBeenCalled();
	});
});
