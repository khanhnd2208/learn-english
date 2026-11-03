import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { getSenseBundles } from '@/services/english/enContentService';
import { EN_LOCKED_PREVIEW_WORDS } from '@/lib/english/constants';
import { countStages } from '@/lib/english/schedule';
import type { SenseBundle } from '@/lib/english/senseBundle';
import type { SetWordList } from '@/lib/english/setWordList';

export async function getEnrolledSetWords(userId: string, setId: string): Promise<SetWordList> {
	const set = await prisma.enSet.findFirst({ where: { id: setId, status: 'published', enrollments: { some: { userId } } }, select: { id: true, title: true, items: { orderBy: [{ position: 'asc' }, { id: 'asc' }], where: { sense: { status: 'published' } }, select: { senseId: true, sense: { select: { meaningVi: true, partOfSpeech: true, word: { select: { lemma: true, ipa: true, audioPath: true } } } } } } } });
	if (!set) throw new AppError('Bộ từ này không còn khả dụng.', 404);
	const seen = new Set<string>();
	return { id: set.id, title: set.title, words: set.items.flatMap((item) => {
		if (!item.senseId || !item.sense || seen.has(item.senseId)) return [];
		seen.add(item.senseId);
		return [{ senseId: item.senseId, lemma: item.sense.word.lemma, ipa: item.sense.word.ipa, partOfSpeech: item.sense.partOfSpeech, meaningVi: item.sense.meaningVi, recordedAudioAvailable: Boolean(item.sense.word.audioPath.trim()) }];
	}) };
}

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
	subjectId: string | null;
	subjectTitle: string | null;
	subjectEnrolled: boolean;
}

export async function listEnglishSets(userId: string, includeDrafts: boolean, opts: { storeOnly?: boolean; setIds?: string[] } = {}): Promise<EnglishSetSummary[]> {
	const now = new Date();
	const sets = await prisma.enSet.findMany({
		where: { ...(includeDrafts ? {} : { status: 'published' }), ...(opts.storeOnly ? { listed: true } : {}), ...(opts.setIds ? { id: { in: opts.setIds } } : {}) },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		select: { id: true, title: true, description: true, status: true, listed: true, accessCode: true,
			enrollments: { where: { userId }, select: { id: true } }, _count: { select: { enrollments: true } } },
	});
	const setIds = sets.map((set) => set.id);
	if (!setIds.length) return [];
	// The legacy view counts items, including a sense repeated within a set.
	const counts = await prisma.$queryRaw<Array<{ setId: string; words: number; learned: number; longTerm: number; learning: number; remembering: number; dueToday: number }>>(Prisma.sql`
		SELECT i."setId", count(i."senseId")::int AS words,
		count(i."senseId") FILTER (WHERE ws."box" >= 1)::int AS learned,
		count(i."senseId") FILTER (WHERE ws."box" >= 4)::int AS "longTerm",
		count(i."senseId") FILTER (WHERE ws."box" = 1)::int AS learning,
		count(i."senseId") FILTER (WHERE ws."box" IN (2, 3))::int AS remembering,
		count(i."senseId") FILTER (WHERE ws."box" >= 1 AND ws."dueAt" <= ${now})::int AS "dueToday"
		FROM "EnSetItem" i JOIN "EnSense" se ON se."id" = i."senseId" ${includeDrafts ? Prisma.empty : Prisma.sql`AND se."status" = 'published'`}
		LEFT JOIN "EnWordState" ws ON ws."senseId" = i."senseId" AND ws."userId" = ${userId}
		WHERE i."setId" = ANY(${setIds}::text[]) GROUP BY i."setId"`);
	const bySet = new Map(counts.map((row) => [row.setId, row]));
	return sets.map((set) => {
		const row = bySet.get(set.id) ?? { words: 0, learned: 0, longTerm: 0, learning: 0, remembering: 0, dueToday: 0 };
		return { id: set.id, title: set.title, description: set.description, status: set.status,
			words: row.words, enrolled: set.enrollments.length > 0, learned: row.learned, longTerm: row.longTerm,
			stages: { new: row.words - row.learning - row.remembering - row.longTerm, learning: row.learning, remembering: row.remembering, longTerm: row.longTerm },
			dueToday: row.dueToday, locked: set.accessCode != null, listed: set.listed,
			...(includeDrafts ? { accessCode: set.accessCode, learners: set._count.enrollments } : {}),
		};
	});
}

export async function unenrollEnglishSet(userId: string, setId: string) {
	const set = await prisma.enSet.findUnique({ where: { id: setId }, select: { subjectId: true } });
	if (set?.subjectId) {
		const inSubject = await prisma.enVocabSubjectEnrollment.findUnique({ where: { userId_subjectId: { userId, subjectId: set.subjectId } }, select: { id: true } });
		if (inSubject) throw new AppError('Bộ này thuộc môn học bạn đã đăng ký. Hãy rời cả môn học.', 400);
	}
	await prisma.enEnrollment.deleteMany({ where: { userId, setId } });
}

export async function getEnglishSetDetail(userId: string, setId: string, includeDrafts: boolean): Promise<EnglishSetDetail> {
	const set = await prisma.enSet.findFirst({
		where: { id: setId, ...(includeDrafts ? {} : { status: 'published' }) },
		include: {
			subject: { select: { id: true, title: true, status: true, listed: true, accessCode: true, enrollments: { where: { userId }, select: { id: true } } } },
			items: { orderBy: { position: 'asc' }, select: { senseId: true } },
			enrollments: { where: { userId }, select: { id: true } },
		},
	});
	if (!set) throw new AppError('Không tìm thấy bộ học', 404);
	const enrolled = set.enrollments.length > 0;
	// Admins see everything. A set outside a visible subject stays open only to learners who already have it.
	if (!includeDrafts && !enrolled && (!set.subject || set.subject.status !== 'published' || !set.subject.listed)) throw new AppError('Không tìm thấy bộ học', 404);
	const previewOnly = !includeDrafts && !enrolled && set.subject?.accessCode != null;
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
		locked: set.subject ? set.subject.accessCode != null : false,
		listed: set.subject ? set.subject.listed : false,
		previewOnly,
		subjectId: set.subjectId,
		subjectTitle: set.subject?.title ?? null,
		subjectEnrolled: (set.subject?.enrollments.length ?? 0) > 0,
		wordCount,
		words: ordered.map((bundle) => ({
			bundle,
			box: bySense.get(bundle.sense.id)?.box ?? 0,
			lapses: bySense.get(bundle.sense.id)?.lapses ?? 0,
		})),
	};
}
