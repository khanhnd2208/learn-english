import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { getEnglishBlueprint, listEnglishActivities } from '@/services/english/enActivityService';
import { getSenseBundles } from '@/services/english/enContentService';
import { vnDayKey } from '@/lib/english/gapRule';
import { isLongTerm } from '@/lib/english/schedule';
import type { SenseBundle } from '@/lib/english/senseBundle';
import type { WordStatusName } from '@/lib/english/wordState';
import type { FinishedEnglishTest } from '@/lib/english/testTypes';

export interface EnglishSetSummary {
	id: string;
	title: string;
	description: string;
	status: string;
	words: number;
	patterns: number;
	enrolled: boolean;
	mastered: number;
	practicing: number;
	inMistakeBook: number;
	label: string;
	/** Words with a review schedule (box ≥ 1). */
	learned: number;
	/** Words recalled after a gap of at least 7 days (box ≥ 4). */
	longTerm: number;
}

export interface EnglishSetWord {
	bundle: SenseBundle;
	status: WordStatusName;
	inMistakeBook: boolean;
	lastExposureAt: string | null;
	box: number;
	lapses: number;
}

export interface EnglishSetDetail {
	id: string;
	title: string;
	description: string;
	enrolled: boolean;
	mastered: number;
	wordCount: number;
	studiedToday: number;
	label: string;
	maxWords: number;
	reviewWords: number;
	inMistakeBook: number;
	lastAttempt: FinishedEnglishTest | null;
	activities: Array<{ key: string; label: string; role: string; inPractice: boolean; inTest: boolean; enabled: boolean }>;
	words: EnglishSetWord[];
}

function studyLabel(mastered: number, total: number, exposed: boolean): string {
	if (total > 0 && mastered > 0) return `${mastered}/${total} đã nắm`;
	if (exposed) return 'Đang luyện';
	return 'Chưa học';
}

export async function listEnglishSets(userId: string, includeDrafts: boolean): Promise<EnglishSetSummary[]> {
	const sets = await prisma.enSet.findMany({
		where: includeDrafts ? {} : { status: 'published' },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		include: {
			items: { select: { senseId: true, patternId: true, sense: { select: { status: true } } } },
			enrollments: { where: { userId }, select: { id: true } },
		},
	});
	const senseIds = sets.flatMap((set) => set.items.flatMap((item) => (
		item.senseId && (includeDrafts || item.sense?.status === 'published') ? [item.senseId] : []
	)));
	const states = senseIds.length === 0
		? []
		: await prisma.enWordState.findMany({
			where: { userId, senseId: { in: senseIds } },
			select: { senseId: true, status: true, lastExposureAt: true, inMistakeBook: true, box: true },
		});
	const bySense = new Map(states.map((state) => [state.senseId, state]));
	return sets.map((set) => {
		const published = set.items.flatMap((item) => (
			item.senseId && (includeDrafts || item.sense?.status === 'published') ? [item.senseId] : []
		));
		const mastered = published.filter((id) => bySense.get(id)?.status === 'mastered').length;
		const practicing = published.filter((id) => bySense.get(id)?.status === 'practicing').length;
		const inMistakeBook = published.filter((id) => bySense.get(id)?.inMistakeBook).length;
		const exposed = published.some((id) => bySense.get(id)?.status !== 'new' && bySense.get(id)?.lastExposureAt);
		return {
			id: set.id,
			title: set.title,
			description: set.description,
			status: set.status,
			words: published.length,
			patterns: set.items.filter((item) => item.patternId).length,
			enrolled: set.enrollments.length > 0,
			mastered,
			practicing,
			inMistakeBook,
			label: studyLabel(mastered, published.length, exposed),
			learned: published.filter((id) => (bySense.get(id)?.box ?? 0) >= 1).length,
			longTerm: published.filter((id) => isLongTerm(bySense.get(id)?.box ?? 0)).length,
		};
	});
}

export async function enrollEnglishSet(userId: string, setId: string) {
	const set = await prisma.enSet.findFirst({ where: { id: setId, status: 'published' } });
	if (!set) throw new AppError('Bộ học chưa xuất bản', 404);
	await prisma.enEnrollment.upsert({
		where: { userId_setId: { userId, setId } },
		create: { userId, setId },
		update: {},
	});
}

export async function getEnglishSetDetail(userId: string, setId: string, includeDrafts: boolean): Promise<EnglishSetDetail> {
	const set = await prisma.enSet.findFirst({
		where: { id: setId, ...(includeDrafts ? {} : { status: 'published' }) },
		include: {
			items: { orderBy: { position: 'asc' }, select: { senseId: true, position: true } },
			enrollments: { where: { userId }, select: { id: true } },
		},
	});
	if (!set) throw new AppError('Không tìm thấy bộ học', 404);
	const senseIds = set.items.flatMap((item) => (item.senseId ? [item.senseId] : []));
	const bundles = await getSenseBundles(senseIds, !includeDrafts);
	const bundleById = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
	const ordered = senseIds.flatMap((id) => {
		const bundle = bundleById.get(id);
		return bundle ? [bundle] : [];
	});
	const states = ordered.length === 0
		? []
		: await prisma.enWordState.findMany({
			where: { userId, senseId: { in: ordered.map((bundle) => bundle.sense.id) } },
		});
	const bySense = new Map(states.map((state) => [state.senseId, state]));
	const today = vnDayKey(new Date());
	const words = ordered.map((bundle) => {
		const state = bySense.get(bundle.sense.id);
		return {
			bundle,
			status: state?.status ?? 'new',
			inMistakeBook: state?.inMistakeBook ?? false,
			lastExposureAt: state?.lastExposureAt?.toISOString() ?? null,
			box: state?.box ?? 0,
			lapses: state?.lapses ?? 0,
		};
	});
	const mastered = words.filter((word) => word.status === 'mastered').length;
	const studiedToday = words.filter((word) => word.lastExposureAt && vnDayKey(new Date(word.lastExposureAt)) === today).length;
	const [activities, blueprint, latestAttempt] = await Promise.all([
		listEnglishActivities(),
		getEnglishBlueprint(),
		prisma.enTestAttempt.findFirst({
			where: { userId, setId, status: 'finished' },
			orderBy: { finishedAt: 'desc' },
			include: { items: true, words: true },
		}),
	]);
	let lastAttempt: FinishedEnglishTest | null = null;
	if (latestAttempt) {
		const resultSenses = await prisma.enSense.findMany({
			where: { id: { in: latestAttempt.words.map((word) => word.senseId) } },
			select: { id: true, meaningVi: true, word: { select: { lemma: true } } },
		});
		const labels = new Map(resultSenses.map((sense) => [sense.id, sense]));
		lastAttempt = {
			attemptId: latestAttempt.id,
			status: latestAttempt.status,
			passedCount: latestAttempt.passedCount ?? 0,
			wordCount: latestAttempt.wordCount,
			words: latestAttempt.words.map((word) => ({
				senseId: word.senseId,
				lemma: labels.get(word.senseId)?.word.lemma ?? '',
				meaningVi: labels.get(word.senseId)?.meaningVi ?? '',
				passed: word.passed,
				counted: word.counted,
				items: latestAttempt.items.filter((item) => item.senseId === word.senseId).sort((a, b) => a.position - b.position).map((item) => ({
					id: item.id,
					role: item.role,
					activityKey: item.activityKey,
					prompt: item.prompt,
					answer: item.answer,
					correct: item.correct,
					answerKey: item.answerKey,
				})),
			})),
		};
	}
	return {
		id: set.id,
		title: set.title,
		description: set.description,
		enrolled: set.enrollments.length > 0,
		mastered,
		wordCount: words.length,
		studiedToday,
		label: studyLabel(mastered, words.length, words.some((word) => word.status !== 'new' || word.lastExposureAt)),
		maxWords: blueprint.maxWords,
		reviewWords: blueprint.reviewWords,
		inMistakeBook: words.filter((word) => word.inMistakeBook).length,
		lastAttempt,
		activities: activities.filter((activity) => activity.enabled),
		words,
	};
}

export async function countStudiedToday(userId: string): Promise<number> {
	const since = new Date(Date.now() - 2 * 86_400_000);
	const states = await prisma.enWordState.findMany({
		where: { userId, lastExposureAt: { gte: since } },
		select: { lastExposureAt: true },
	});
	const today = vnDayKey(new Date());
	return states.filter((state) => state.lastExposureAt && vnDayKey(state.lastExposureAt) === today).length;
}

export async function assertEnrolled(userId: string, setId: string) {
	const enrollment = await prisma.enEnrollment.findUnique({ where: { userId_setId: { userId, setId } } });
	if (!enrollment) throw new AppError('Hãy theo học bộ này trước', 403);
}
