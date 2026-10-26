import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnglishQaProgress, shiftEnglishQaDataOneDay } from '@/services/english/enQaService';

const mocks = vi.hoisted(() => ({
	set: vi.fn(), states: vi.fn(), reviews: vi.fn(), attempts: vi.fn(), stateUpdate: vi.fn(), reviewUpdate: vi.fn(), attemptUpdate: vi.fn(),
	stateDelete: vi.fn(), reviewDelete: vi.fn(), attemptDelete: vi.fn(), transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {
	enSet: { findUnique: mocks.set },
	enWordState: { findMany: mocks.states, update: mocks.stateUpdate, deleteMany: mocks.stateDelete },
	enReview: { findMany: mocks.reviews, update: mocks.reviewUpdate, deleteMany: mocks.reviewDelete },
	enTestAttempt: { findMany: mocks.attempts, update: mocks.attemptUpdate, deleteMany: mocks.attemptDelete },
	$transaction: mocks.transaction,
} }));

describe('English QA service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.set.mockResolvedValue({ items: [{ senseId: 'sense-1' }] });
		mocks.transaction.mockImplementation(async (operations: Array<Promise<unknown>>) => Promise.all(operations));
	});

	it('moves only the selected user schedule one day back', async () => {
		mocks.states.mockResolvedValue([{ id: 'state-1', dueAt: new Date('2026-10-26T17:00:00Z'), introducedAt: new Date('2026-10-25T03:00:00Z'), lastReviewedAt: null }]);
		mocks.reviews.mockResolvedValue([{ id: 'review-1', at: new Date('2026-10-25T03:00:00Z') }]);
		mocks.attempts.mockResolvedValue([]);
		mocks.stateUpdate.mockResolvedValue({}); mocks.reviewUpdate.mockResolvedValue({});
		const result = await shiftEnglishQaDataOneDay('user-1', 'set-1');
		expect(result).toEqual({ shiftedStates: 1, shiftedReviews: 1, shiftedTests: 0 });
		expect(mocks.states).toHaveBeenCalledWith({ where: { userId: 'user-1', senseId: { in: ['sense-1'] } } });
		expect(mocks.stateUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ dueAt: new Date('2026-10-25T17:00:00Z') }) }));
		expect(mocks.reviewUpdate).toHaveBeenCalledWith({ where: { id: 'review-1' }, data: { at: new Date('2026-10-24T03:00:00Z') } });
	});

	it('deletes only progress rows scoped to the user and set', async () => {
		mocks.stateDelete.mockResolvedValue({ count: 2 }); mocks.reviewDelete.mockResolvedValue({ count: 5 }); mocks.attemptDelete.mockResolvedValue({ count: 3 });
		const result = await resetEnglishQaProgress('user-1', 'set-1');
		expect(result).toEqual({ deletedStates: 2, deletedReviews: 5, deletedTestAttempts: 3 });
		expect(mocks.reviewDelete).toHaveBeenCalledWith({ where: { userId: 'user-1', senseId: { in: ['sense-1'] } } });
		expect(mocks.attemptDelete).toHaveBeenCalledWith({ where: { userId: 'user-1', setId: 'set-1' } });
	});
});
