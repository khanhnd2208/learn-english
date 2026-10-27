import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayOverview } from '@/services/english/enDailyService';

const mocks = vi.hoisted(() => ({
	states: vi.fn(), enrollments: vi.fn(), items: vi.fn(), reviews: vi.fn(), guidedReviews: vi.fn(), guidedCount: vi.fn(), profile: vi.fn(), bundles: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {
	enWordState: { findMany: mocks.states },
	enEnrollment: { findMany: mocks.enrollments },
	enSetItem: { findMany: mocks.items },
	enReview: { findMany: mocks.reviews },
	enGuidedReviewQuestion: { findMany: mocks.guidedReviews, count: mocks.guidedCount },
	enLearnerProfile: { findUnique: mocks.profile },
} }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: mocks.bundles }));

const now = new Date('2026-10-26T10:00:00+07:00');
const savedState = { id: 'state', senseId: 'sense', box: 3, dueAt: new Date('2026-10-25T00:00:00Z'), lapses: 0, introducedAt: new Date('2026-10-20T00:00:00Z'), lastReviewedAt: null };

describe('daily review enrollment filter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.reviews.mockResolvedValue([]);
		mocks.guidedReviews.mockResolvedValue([]);
		mocks.guidedCount.mockResolvedValue(0);
		mocks.profile.mockResolvedValue(null);
		mocks.items.mockResolvedValue([]);
		mocks.bundles.mockResolvedValue([]);
	});

	it('pauses due words after removing a set and resumes the saved box after downloading it again', async () => {
		let downloaded = true;
		mocks.enrollments.mockImplementation(async () => downloaded ? [{ setId: 'set' }] : []);
		mocks.states.mockImplementation(async ({ where }: { where: { sense: { setItems: { some: { set: { enrollments: { some: { userId: string } } } } } } } }) => {
			expect(where.sense).toEqual({ status: 'published', setItems: { some: { set: { status: 'published', enrollments: { some: { userId: 'learner' } } } } } });
			return downloaded ? [savedState] : [];
		});
		const first = await getTodayOverview('learner', now);
		expect(first).toMatchObject({ dueTotal: 1, learnedCount: 1 });
		downloaded = false;
		const paused = await getTodayOverview('learner', new Date(now.getTime() + 1000));
		expect(paused).toMatchObject({ dueTotal: 0, learnedCount: 0, enrolledSets: 0 });
		downloaded = true;
		const resumed = await getTodayOverview('learner', new Date(now.getTime() + 2000));
		expect(resumed).toMatchObject({ dueTotal: 1, learnedCount: 1 });
		expect(savedState.box).toBe(3);
	});
});
