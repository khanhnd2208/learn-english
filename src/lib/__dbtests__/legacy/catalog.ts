// Frozen copy used only as a parity oracle. Do not edit.
import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { getSenseBundles } from '@/services/english/enContentService';
import { EN_LOCKED_PREVIEW_WORDS } from '@/lib/english/constants';
import { countStages, isLongTerm } from './schedule';
import type { SenseBundle } from '@/lib/english/senseBundle';

export interface EnglishSetSummary {
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
	locked: boolean;
	/** False once an admin hides the set from the store; learners who have it keep studying. */
	listed: boolean;
	accessCode?: string | null;
	learners?: number;
}

export interface EnglishSetWord {
	bundle: SenseBundle;
	box: number;
	lapses: number;
}

export interface EnglishSetDetail {
	id: string;
	title: string;
	description: string;
	/** 'draft' until at least one word is published; only admins can open a draft. */
	status: string;
	enrolled: boolean;
	wordCount: number;
	words: EnglishSetWord[];
	locked: boolean;
	listed: boolean;
	/** A locked set seen before unlocking shows only the first few words. */
	previewOnly: boolean;
}

export async function listEnglishSets(userId: string, includeDrafts: boolean, opts: { storeOnly?: boolean } = {}): Promise<EnglishSetSummary[]> {
	const now = new Date();
	const sets = await prisma.enSet.findMany({
		where: { ...(includeDrafts ? {} : { status: 'published' }), ...(opts.storeOnly ? { listed: true } : {}) },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		include: {
			items: { select: { senseId: true, sense: { select: { status: true } } } },
			enrollments: { where: { userId }, select: { id: true } },
		_count: { select: { enrollments: true } },
		},
	});
	const visible = (item: (typeof sets)[number]['items'][number]) => (
		item.senseId && (includeDrafts || item.sense?.status === 'published') ? [item.senseId] : []
	);
	const senseIds = sets.flatMap((set) => set.items.flatMap(visible));
	const states = await (
		senseIds.length === 0
			? []
			: prisma.enWordState.findMany({ where: { userId, senseId: { in: senseIds } }, select: { senseId: true, box: true, dueAt: true } })
	);
	const boxOf = new Map(states.map((state) => [state.senseId, state.box]));
	const stateOf = new Map(states.map((state) => [state.senseId, state]));
	return sets.map((set) => {
		const published = set.items.flatMap(visible);
		return {
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
			locked: set.accessCode != null,
			listed: set.listed,
			...(includeDrafts ? { accessCode: set.accessCode, learners: set._count.enrollments } : {}),
		};
	});
}

function accessCodeMatches(expected: string, actual: string): boolean {
	const expectedHash = createHash('sha256').update(expected.trim().toLocaleLowerCase('vi')).digest();
	const actualHash = createHash('sha256').update(actual.trim().toLocaleLowerCase('vi')).digest();
	return timingSafeEqual(expectedHash, actualHash);
}

export async function enrollEnglishSet(userId: string, setId: string, accessCode?: string) {
	const set = await prisma.enSet.findFirst({ where: { id: setId, status: 'published' } });
	if (!set) throw new AppError('Bộ học chưa xuất bản', 404);
	const existing = await prisma.enEnrollment.findUnique({ where: { userId_setId: { userId, setId } } });
	if (!existing) {
		if (!set.listed) throw new AppError('Bộ học không còn mở đăng ký', 404);
		if (set.accessCode != null && (typeof accessCode !== 'string' || !accessCodeMatches(set.accessCode, accessCode))) {
			throw new AppError('Mật khẩu không đúng', 403, 'ACCESS_CODE');
		}
	}
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
	const enrolled = set.enrollments.length > 0;
	// Admins see everything. A hidden set stays open only to learners who already have it.
	if (!includeDrafts && !enrolled && !set.listed) throw new AppError('Không tìm thấy bộ học', 404);
	const previewOnly = !includeDrafts && !enrolled && set.accessCode != null;
	const allSenseIds = set.items.flatMap((item) => (item.senseId ? [item.senseId] : []));
	const bundles = await getSenseBundles(allSenseIds, !includeDrafts);
	const visibleIds = new Set(bundles.map((bundle) => bundle.sense.id));
	const wordCount = allSenseIds.filter((id) => visibleIds.has(id)).length;
	const senseIds = previewOnly ? allSenseIds.filter((id) => visibleIds.has(id)).slice(0, EN_LOCKED_PREVIEW_WORDS) : allSenseIds;
	const bundleById = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
	const ordered = senseIds.flatMap((id) => {
		const bundle = bundleById.get(id);
		return bundle ? [bundle] : [];
	});
	const states = await (
		ordered.length === 0
			? []
			: prisma.enWordState.findMany({
				where: { userId, senseId: { in: ordered.map((bundle) => bundle.sense.id) } },
				select: { senseId: true, box: true, lapses: true },
			})
	);
	const bySense = new Map(states.map((state) => [state.senseId, state]));
	return {
		id: set.id,
		title: set.title,
		description: set.description,
		status: set.status,
		enrolled,
		locked: set.accessCode != null,
		listed: set.listed,
		previewOnly,
		wordCount,
		words: ordered.map((bundle) => ({
			bundle,
			box: bySense.get(bundle.sense.id)?.box ?? 0,
			lapses: bySense.get(bundle.sense.id)?.lapses ?? 0,
		})),
	};
}
