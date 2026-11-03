import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	setFindFirst: vi.fn(),
	transaction: vi.fn(),
	setFindUnique: vi.fn(),
	setDelete: vi.fn(),
	preferenceFindMany: vi.fn(),
	preferenceUpdate: vi.fn(),
	sessionFindMany: vi.fn(),
	sessionUpdate: vi.fn(),
	wordStateFindMany: vi.fn(),
	getSenseBundles: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {
	enSet: { findFirst: mocks.setFindFirst, findUnique: mocks.setFindUnique, delete: mocks.setDelete },
	enWordState: { findMany: mocks.wordStateFindMany },
	$transaction: mocks.transaction,
} }));
vi.mock('@/services/english/enContentService', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/services/english/enContentService')>()),
	getSenseBundles: mocks.getSenseBundles,
}));

import { getEnglishSetDetail } from '@/services/english/enCatalogService';
import { deleteEnglishSet as deleteStoreSet } from '@/services/english/enContentService';

describe('English store access', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('removes a deleted set from review selections', async () => {
		const tx = {
			enSet: { findUnique: mocks.setFindUnique, delete: mocks.setDelete },
			enReviewPreference: { findMany: mocks.preferenceFindMany, update: mocks.preferenceUpdate },
			enGuidedReviewSession: { findMany: mocks.sessionFindMany, update: mocks.sessionUpdate },
		};
		mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));
		mocks.setFindUnique.mockResolvedValue({ id: 'set-1' });
		mocks.preferenceFindMany.mockResolvedValue([{ userId: 'user-1', selectedSetIds: ['set-1', 'set-2'] }]);
		mocks.sessionFindMany.mockResolvedValue([{ id: 'session-1', selectedSetIds: ['set-1'] }]);
		mocks.preferenceUpdate.mockResolvedValue({});
		mocks.sessionUpdate.mockResolvedValue({});
		mocks.setDelete.mockResolvedValue({});

		await deleteStoreSet('set-1');
		expect(mocks.preferenceUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { selectedSetIds: { set: ['set-2'] } } }));
		expect(mocks.sessionUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { selectedSetIds: { set: [] } } }));
		expect(mocks.setDelete).toHaveBeenCalledWith({ where: { id: 'set-1' } });
	});

	describe('set detail', () => {
		const ids = Array.from({ length: 8 }, (_, index) => `sense-${index}`);
		const setRow = (overrides: Record<string, unknown>) => ({ id: 'set-1', title: 'Set', description: '', status: 'published', listed: true, accessCode: null, subjectId: 'subject-1', subject: { id: 'subject-1', title: 'Subject', status: 'published', listed: true, accessCode: null, enrollments: [] }, items: ids.map((senseId) => ({ senseId })), enrollments: [], ...overrides });

		beforeEach(() => {
			mocks.wordStateFindMany.mockResolvedValue([]);
			mocks.getSenseBundles.mockImplementation(async (senseIds: string[]) => senseIds.map((id) => ({ sense: { id } })));
		});

		it('shows only sample words of a locked set before unlocking', async () => {
			mocks.setFindFirst.mockResolvedValue(setRow({ subject: { id: 'subject-1', title: 'Subject', status: 'published', listed: true, accessCode: 'code', enrollments: [] } }));
			const detail = await getEnglishSetDetail('user-1', 'set-1', false);
			expect(detail).toMatchObject({ previewOnly: true, wordCount: 8 });
			expect(detail.words).toHaveLength(5);
		});

		it('shows every word of a locked set to a learner who has it and to admins', async () => {
			mocks.setFindFirst.mockResolvedValue(setRow({ accessCode: 'code', enrollments: [{ id: 'enrollment-1' }] }));
			expect((await getEnglishSetDetail('user-1', 'set-1', false)).words).toHaveLength(8);
			mocks.setFindFirst.mockResolvedValue(setRow({ accessCode: 'code' }));
			const admin = await getEnglishSetDetail('admin-1', 'set-1', true);
			expect(admin.previewOnly).toBe(false);
			expect(admin.words).toHaveLength(8);
		});

		it('hides a set in an unlisted subject from learners who do not have it', async () => {
			mocks.setFindFirst.mockResolvedValue(setRow({ subject: { id: 'subject-1', title: 'Subject', status: 'published', listed: false, accessCode: null, enrollments: [] } }));
			await expect(getEnglishSetDetail('user-1', 'set-1', false)).rejects.toMatchObject({ status: 404 });
			mocks.setFindFirst.mockResolvedValue(setRow({ listed: false, enrollments: [{ id: 'enrollment-1' }] }));
			expect((await getEnglishSetDetail('user-1', 'set-1', false)).words).toHaveLength(8);
		});

		it('hides a standalone set from learners who do not have it', async () => {
			mocks.setFindFirst.mockResolvedValue(setRow({ subjectId: null, subject: null }));
			await expect(getEnglishSetDetail('user-1', 'set-1', false)).rejects.toMatchObject({ status: 404 });
		});

		it('keeps a standalone set open to a learner who has it', async () => {
			mocks.setFindFirst.mockResolvedValue(setRow({ subjectId: null, subject: null, enrollments: [{ id: 'enrollment-1' }] }));
			expect(await getEnglishSetDetail('user-1', 'set-1', false)).toMatchObject({ listed: false, subjectEnrolled: false });
		});
	});
});
