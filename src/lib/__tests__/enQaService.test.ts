import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnglishQaProgress, shiftEnglishQaDataOneDay } from '@/services/english/enQaService';

const mocks = vi.hoisted(() => ({
	set: vi.fn(), states: vi.fn(), practices: vi.fn(), attempts: vi.fn(), stateUpdate: vi.fn(), practiceUpdate: vi.fn(), attemptUpdate: vi.fn(),
	stateDelete: vi.fn(), practiceDelete: vi.fn(), attemptDelete: vi.fn(), transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {
	enSet: { findUnique: mocks.set },
	enWordState: { findMany: mocks.states, update: mocks.stateUpdate, deleteMany: mocks.stateDelete },
	enPracticeSession: { findMany: mocks.practices, update: mocks.practiceUpdate, deleteMany: mocks.practiceDelete },
	enTestAttempt: { findMany: mocks.attempts, update: mocks.attemptUpdate, deleteMany: mocks.attemptDelete },
	$transaction: mocks.transaction,
} }));

describe('English QA service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.set.mockResolvedValue({ items: [{ senseId: 'sense-1' }] });
		mocks.transaction.mockImplementation(async (operations: Array<Promise<unknown>>) => Promise.all(operations));
	});

	it('shifts only the selected user data by one day', async () => {
		mocks.states.mockResolvedValue([{ id: 'state-1', lastExposureAt: new Date('2026-10-25T00:00:00Z'), lastTestedAt: null, mistakeAddedAt: null }]);
		mocks.practices.mockResolvedValue([{ id: 'practice-1', startedAt: new Date('2026-10-25T00:00:00Z'), endedAt: null }]);
		mocks.attempts.mockResolvedValue([]);
		mocks.stateUpdate.mockResolvedValue({}); mocks.practiceUpdate.mockResolvedValue({});
		await shiftEnglishQaDataOneDay('user-1', 'set-1');
		expect(mocks.states).toHaveBeenCalledWith({ where: { userId: 'user-1', senseId: { in: ['sense-1'] } } });
		expect(mocks.stateUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastExposureAt: new Date('2026-10-24T00:00:00Z') }) }));
	});

	it('deletes only progress rows scoped to the user and set', async () => {
		mocks.stateDelete.mockResolvedValue({ count: 2 }); mocks.practiceDelete.mockResolvedValue({ count: 1 }); mocks.attemptDelete.mockResolvedValue({ count: 3 });
		const result = await resetEnglishQaProgress('user-1', 'set-1');
		expect(result).toEqual({ deletedStates: 2, deletedPracticeSessions: 1, deletedTestAttempts: 3 });
		expect(mocks.stateDelete).toHaveBeenCalledWith({ where: { userId: 'user-1', senseId: { in: ['sense-1'] } } });
		expect(mocks.practiceDelete).toHaveBeenCalledWith({ where: { userId: 'user-1', setId: 'set-1' } });
	});
});
