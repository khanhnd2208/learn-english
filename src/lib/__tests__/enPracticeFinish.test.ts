import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { finishEnglishPractice } from '@/services/english/enPracticeService';

const harness = vi.hoisted(() => ({
	findFirst: vi.fn(),
	update: vi.fn(),
	findUnique: vi.fn(),
	upsert: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		enPracticeSession: { findFirst: harness.findFirst },
		$transaction: vi.fn((fn: (tx: {
			enPracticeSession: { update: typeof harness.update };
			enWordState: { findUnique: typeof harness.findUnique; upsert: typeof harness.upsert };
		}) => Promise<unknown>) => fn({
			enPracticeSession: { update: harness.update },
			enWordState: { findUnique: harness.findUnique, upsert: harness.upsert },
		})),
	},
}));

describe('finishEnglishPractice', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-22T00:01:00.900Z'));
		harness.findFirst.mockResolvedValue({
			id: 'session-1',
			userId: 'user-a',
			startedAt: new Date('2026-10-22T00:00:00.000Z'),
			endedAt: null,
		});
		harness.findUnique.mockResolvedValue(null);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('uses the extended transaction timeout and max wait', async () => {
		const result = await finishEnglishPractice('user-a', {
			sessionId: 'session-1', activeSeconds: 30, senseIds: ['sense-1'],
		});
		expect(result).toEqual({ ok: true });
		expect(prisma.$transaction).toHaveBeenCalledWith(
			expect.any(Function),
			{ timeout: 30_000, maxWait: 10_000 },
		);
		expect(harness.upsert).toHaveBeenCalledOnce();
	});

	it('caps activeSeconds at the elapsed whole seconds', async () => {
		await finishEnglishPractice('user-a', {
			sessionId: 'session-1', activeSeconds: 999, senseIds: ['sense-1'],
		});
		expect(harness.update).toHaveBeenCalledWith({
			where: { id: 'session-1' },
			data: {
				endedAt: new Date('2026-10-22T00:01:00.900Z'),
				activeSeconds: 60,
				senseIds: ['sense-1'],
			},
		});
	});
});
