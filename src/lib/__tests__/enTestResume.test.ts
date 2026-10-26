import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startEnglishTest } from '@/services/english/enTestService';

const mocks = vi.hoisted(() => ({
	updateMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), setItems: vi.fn(), states: vi.fn(), getBundles: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {
	enTestAttempt: { updateMany: mocks.updateMany, findFirst: mocks.findFirst, create: mocks.create },
	enSetItem: { findMany: mocks.setItems },
	enWordState: { findMany: mocks.states },
} }));
vi.mock('@/services/english/enCatalogService', () => ({ assertEnrolled: vi.fn() }));
vi.mock('@/services/english/enContentService', () => ({ getSenseBundles: mocks.getBundles }));
vi.mock('@/services/english/enActivityService', () => ({
	getEnglishBlueprint: vi.fn(async () => ({ recognizeKinds: ['meaning_choice'], recallKinds: ['recall_type'], maxWords: 30, reviewWords: 20, minGapDays: 1 })),
	listEnglishActivities: vi.fn(async () => []),
	usableKinds: vi.fn((kinds: string[]) => kinds),
}));
vi.mock('@/services/english/enPracticeService', () => ({ reviewSenseIds: vi.fn(async () => []) }));
vi.mock('@/lib/english/activities', () => ({
	poolFromBundles: vi.fn(() => ({})), randomRng: vi.fn(() => ({})), activityByKey: vi.fn(),
	buildTest: vi.fn(() => ({ dropped: [], items: [
		{ senseId: 'sense-1', role: 'recall', activityKey: 'recall_type', prompt: { meaningVi: 'vé' }, answerKey: 'ticket', accepted: [] },
		{ senseId: 'sense-1', role: 'recognize', activityKey: 'meaning_choice', prompt: { lemma: 'ticket', choices: ['vé'] }, answerKey: 'vé', accepted: [] },
	] })),
}));

const bundle = { sense: { id: 'sense-1' }, word: { lemma: 'ticket' } };

describe('startEnglishTest resume and restart', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.updateMany.mockResolvedValue({ count: 0 });
		mocks.setItems.mockResolvedValue([{ senseId: 'sense-1' }]);
		mocks.states.mockResolvedValue([]);
		mocks.getBundles.mockResolvedValue([bundle]);
		mocks.create.mockResolvedValue({ id: 'new-attempt', wordCount: 1, items: [
			{ id: 'new-1', position: 0, activityKey: 'recall_type', prompt: { meaningVi: 'vé' }, answer: null },
			{ id: 'new-2', position: 1, activityKey: 'meaning_choice', prompt: { lemma: 'ticket' }, answer: null },
		] });
	});

	it('returns a recent matching attempt with saved answers', async () => {
		mocks.findFirst.mockResolvedValue({ id: 'open-1', wordCount: 1, recallLockedAt: null, items: [{ id: 'item-1', position: 0, role: 'recall', activityKey: 'recall_type', prompt: { meaningVi: 'vé' }, answer: 'ticket', servedAt: new Date() }] });
		const result = await startEnglishTest('user-1', { mode: 'set', setId: 'set-1' });
		expect(result.resumed).toBe(true);
		expect(result.items[0]?.answer).toBe('ticket');
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it('abandons the matching open attempt and creates a new one when restart is true', async () => {
		mocks.findFirst.mockResolvedValue(null);
		const result = await startEnglishTest('user-1', { mode: 'set', setId: 'set-1', restart: true });
		expect(result).toMatchObject({ attemptId: 'new-attempt', resumed: false, wordCount: 1 });
		expect(mocks.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', mode: 'set', setId: 'set-1', status: 'in_progress' }, data: { status: 'abandoned' } });
	});
});
