import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { getDailyTasks, type DailyTasks } from '@/services/english/enQuizService';
import { getSenseBundles } from '@/services/english/enContentService';
import { countStages, isLongTerm } from '@/lib/english/schedule';
import type { QuizKind } from '@/lib/english/quiz';
import type { SenseBundle } from '@/lib/english/senseBundle';

export type SetDailyTasks = Partial<Record<QuizKind, { passedCount: number; wordCount: number }>>;

export interface EnglishSetSummary {
	dailyTasks: SetDailyTasks;
	id: string;
	title: string;
	description: string;
	status: string;
	words: number;
	enrolled: boolean;
	/** Words with a review schedule (box ≥ 1). */
	learned: number;
	/** Words recalled after a gap of at least 7 days (box ≥ 4). */
	longTerm: number;
	stages: ReturnType<typeof countStages>;
	dueToday: number;
}

export interface EnglishSetWord {
	bundle: SenseBundle;
	box: number;
	lapses: number;
}

export interface EnglishSetDetail {
	dailyTasks: SetDailyTasks;
	id: string;
	title: string;
	description: string;
	enrolled: boolean;
	wordCount: number;
	words: EnglishSetWord[];
}

function tasksForSet(daily: DailyTasks, setId: string): SetDailyTasks {
	return Object.fromEntries(Object.entries(daily).flatMap(([kind, task]) => (
		task?.setId === setId ? [[kind, { passedCount: task.passedCount, wordCount: task.wordCount }]] : []
	)));
}

export async function listEnglishSets(userId: string, includeDrafts: boolean): Promise<EnglishSetSummary[]> {
	const now = new Date();
	const sets = await prisma.enSet.findMany({
		where: includeDrafts ? {} : { status: 'published' },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		include: {
			items: { select: { senseId: true, sense: { select: { status: true } } } },
			enrollments: { where: { userId }, select: { id: true } },
		},
	});
	const visible = (item: (typeof sets)[number]['items'][number]) => (
		item.senseId && (includeDrafts || item.sense?.status === 'published') ? [item.senseId] : []
	);
	const senseIds = sets.flatMap((set) => set.items.flatMap(visible));
	const [states, daily] = await Promise.all([
		senseIds.length === 0
			? []
			: prisma.enWordState.findMany({ where: { userId, senseId: { in: senseIds } }, select: { senseId: true, box: true, dueAt: true } }),
		getDailyTasks(userId),
	]);
	const boxOf = new Map(states.map((state) => [state.senseId, state.box]));
	const stateOf = new Map(states.map((state) => [state.senseId, state]));
	return sets.map((set) => {
		const published = set.items.flatMap(visible);
		return {
			dailyTasks: tasksForSet(daily, set.id),
			id: set.id,
			title: set.title,
			description: set.description,
			status: set.status,
			words: published.length,
			enrolled: set.enrollments.length > 0,
			learned: published.filter((id) => (boxOf.get(id) ?? 0) >= 1).length,
			longTerm: published.filter((id) => isLongTerm(boxOf.get(id) ?? 0)).length,
			stages: countStages(published.map((id) => boxOf.get(id))),
			dueToday: published.filter((id) => { const state = stateOf.get(id); return state && state.box >= 1 && state.dueAt <= now; }).length,
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

export async function unenrollEnglishSet(userId: string, setId: string) {
	await prisma.enEnrollment.deleteMany({ where: { userId, setId } });
}

export async function getEnglishSetDetail(userId: string, setId: string, includeDrafts: boolean): Promise<EnglishSetDetail> {
	const set = await prisma.enSet.findFirst({
		where: { id: setId, ...(includeDrafts ? {} : { status: 'published' }) },
		include: {
			items: { orderBy: { position: 'asc' }, select: { senseId: true } },
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
	const [states, daily] = await Promise.all([
		ordered.length === 0
			? []
			: prisma.enWordState.findMany({
				where: { userId, senseId: { in: ordered.map((bundle) => bundle.sense.id) } },
				select: { senseId: true, box: true, lapses: true },
			}),
		getDailyTasks(userId),
	]);
	const bySense = new Map(states.map((state) => [state.senseId, state]));
	return {
		dailyTasks: tasksForSet(daily, set.id),
		id: set.id,
		title: set.title,
		description: set.description,
		enrolled: set.enrollments.length > 0,
		wordCount: ordered.length,
		words: ordered.map((bundle) => ({
			bundle,
			box: bySense.get(bundle.sense.id)?.box ?? 0,
			lapses: bySense.get(bundle.sense.id)?.lapses ?? 0,
		})),
	};
}
