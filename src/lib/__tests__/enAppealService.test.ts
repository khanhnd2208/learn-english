import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bundle } from './fixtures/bundle';

const mock = vi.hoisted(() => ({ reviewFirst: vi.fn(), reviewUnique: vi.fn(), reviewUpdate: vi.fn(), appealCreate: vi.fn(), appealUnique: vi.fn(), appealUpdateMany: vi.fn(), stateUnique: vi.fn(), stateUpdate: vi.fn(), bundles: vi.fn() }));
vi.mock('@/lib/prisma', () => {
	const client = {
		enReview: { findFirst: mock.reviewFirst, findUnique: mock.reviewUnique, update: mock.reviewUpdate },
		enAnswerAppeal: { create: mock.appealCreate, findUnique: mock.appealUnique, updateMany: mock.appealUpdateMany },
		enWordState: { findUnique: mock.stateUnique, update: mock.stateUpdate },
	};
	return { prisma: { ...client, $transaction: (fn: (tx: typeof client) => unknown) => fn(client) } };
});
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: mock.bundles }));
import { createAppeal, resolveAppeal } from '@/services/english/enAppealService';

const user = { id: 'u1', name: 'Lan', email: 'lan@example.com' };
const now = new Date('2026-10-29T05:00:00Z');
const at = new Date('2026-10-28T05:00:00Z');

beforeEach(() => { vi.clearAllMocks(); mock.bundles.mockResolvedValue([bundle(1)]); });

describe('createAppeal', () => {
	it('stores a wrong typed answer with the expected word', async () => {
		mock.reviewFirst.mockResolvedValue({ id: 'r1', senseId: 's1', correct: false, at });
		await createAppeal(user, { reviewId: 'r1', answer: ' glad ', note: 'synonym' }, now);
		expect(mock.reviewFirst).toHaveBeenCalledWith({ where: { id: 'r1', userId: 'u1' } });
		expect(mock.appealCreate.mock.calls[0]![0].data).toMatchObject({ reviewId: 'r1', userId: 'u1', answer: 'glad', expected: bundle(1).word.lemma, note: 'synonym' });
	});
	it('refuses empty answers, correct reviews and old reviews', async () => {
		await expect(createAppeal(user, { reviewId: 'r1', answer: '  ' }, now)).rejects.toMatchObject({ status: 400 });
		mock.reviewFirst.mockResolvedValueOnce({ id: 'r1', senseId: 's1', correct: true, at });
		await expect(createAppeal(user, { reviewId: 'r1', answer: 'glad' }, now)).rejects.toMatchObject({ status: 409 });
		mock.reviewFirst.mockResolvedValueOnce({ id: 'r1', senseId: 's1', correct: false, at: new Date('2026-10-01T00:00:00Z') });
		await expect(createAppeal(user, { reviewId: 'r1', answer: 'glad' }, now)).rejects.toMatchObject({ status: 409 });
		expect(mock.appealCreate).not.toHaveBeenCalled();
	});
});

describe('resolveAppeal', () => {
	beforeEach(() => {
		mock.appealUnique.mockResolvedValue({ id: 'a1', reviewId: 'r1', userId: 'u1', senseId: 's1', status: 'pending' });
		mock.appealUpdateMany.mockResolvedValue({ count: 1 });
	});
	it('accepting marks the review correct and restores the schedule', async () => {
		mock.reviewUnique.mockResolvedValue({ id: 'r1', at, boxBefore: 3, boxAfter: 2, scheduled: true });
		mock.stateUnique.mockResolvedValue({ id: 'st1', box: 2, lapses: 1, dueAt: at, lastReviewedAt: at });
		const result = await resolveAppeal('admin', { id: 'a1', decision: 'accepted' }, now);
		expect(result).toEqual({ id: 'a1', status: 'accepted', restored: true });
		expect(mock.stateUpdate.mock.calls[0]![0]).toMatchObject({ where: { id: 'st1' }, data: { box: 4, lapses: 0 } });
		expect(mock.reviewUpdate.mock.calls[0]![0]).toEqual({ where: { id: 'r1' }, data: { correct: true, boxAfter: 4 } });
	});
	it('rejecting leaves the schedule alone', async () => {
		const result = await resolveAppeal('admin', { id: 'a1', decision: 'rejected' }, now);
		expect(result.restored).toBe(false);
		expect(mock.stateUpdate).not.toHaveBeenCalled();
		expect(mock.reviewUpdate).not.toHaveBeenCalled();
		expect(mock.appealUpdateMany.mock.calls[0]![0].data).toMatchObject({ status: 'rejected', resolvedBy: 'admin' });
	});
	it('cannot resolve twice', async () => {
		mock.appealUnique.mockResolvedValue({ id: 'a1', status: 'accepted' });
		await expect(resolveAppeal('admin', { id: 'a1', decision: 'accepted' }, now)).rejects.toMatchObject({ status: 409 });
	});
});
