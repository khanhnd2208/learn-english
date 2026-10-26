import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_TX_TIMEOUT_MS, EN_TX_MAX_WAIT_MS } from '@/lib/english/constants';
import { isActivityKey } from '@/lib/english/activities';
import { applyPracticeExposure, emptyWordState, type WordStateSnapshot } from '@/lib/english/wordState';
import { assertEnrolled } from '@/services/english/enCatalogService';
import { getSenseBundles } from '@/services/english/enContentService';
import { getEnglishBlueprint } from '@/services/english/enActivityService';
import { vnDayKey } from '@/lib/english/gapRule';
import { pickReviewSenses, type ReviewCandidate } from '@/lib/english/reviewPick';
import { randomRng } from '@/lib/english/activities/rng';
import type { EnWordState } from '@prisma/client';

function snapshot(row: EnWordState): WordStateSnapshot {
	return {
		status: row.status,
		lastExposureAt: row.lastExposureAt,
		lastTestedAt: row.lastTestedAt,
		masteredAt: row.masteredAt,
		inMistakeBook: row.inMistakeBook,
		mistakeAddedAt: row.mistakeAddedAt,
	};
}

export async function reviewSenseIds(userId: string, count: number): Promise<string[]> {
	const enrollments = await prisma.enEnrollment.findMany({
		where: { userId, set: { status: 'published' } },
		select: { setId: true },
	});
	const setIds = enrollments.map((row) => row.setId);
	if (setIds.length === 0) return [];
	const items = await prisma.enSetItem.findMany({
		where: { setId: { in: setIds }, sense: { status: 'published' } },
		select: { senseId: true },
	});
	const senseIds = [...new Set(items.flatMap((item) => (item.senseId ? [item.senseId] : [])))];
	if (senseIds.length === 0) return [];
	const states = await prisma.enWordState.findMany({
		where: { userId, senseId: { in: senseIds }, status: { not: 'new' } },
	});
	const [events, awarded] = await Promise.all([
		prisma.enTestWordResult.findMany({ where: { userId, senseId: { in: senseIds }, counted: true }, orderBy: { createdAt: 'asc' }, select: { senseId: true, passed: true, createdAt: true } }),
		prisma.enXpEvent.findMany({ where: { userId, senseId: { in: senseIds }, kind: { in: ['hold_7d', 'hold_30d'] } }, select: { senseId: true, kind: true } }),
	]);
	const bySense = new Map<string, typeof events>();
	for (const event of events) bySense.set(event.senseId, [...(bySense.get(event.senseId) ?? []), event]);
	const awardedKeys = new Set(awarded.map((event) => `${event.senseId}:${event.kind}`));
	const nowKey = vnDayKey(new Date());
	const candidates: ReviewCandidate[] = states.map((state) => {
		const history = (bySense.get(state.senseId) ?? []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		let since: Date | null = null;
		for (const result of history) { if (!result.passed) since = null; else if (!since) since = result.createdAt; }
		const heldDays = since ? Math.floor((new Date(`${nowKey}T00:00:00+07:00`).getTime() - since.getTime()) / 86_400_000) : 0;
		return {
			senseId: state.senseId,
			inMistakeBook: state.inMistakeBook,
			mistakeAddedAt: state.mistakeAddedAt,
			lastExposureAt: state.lastExposureAt,
			holdDue: (heldDays >= 7 && !awardedKeys.has(`${state.senseId}:hold_7d`)) || (heldDays >= 30 && !awardedKeys.has(`${state.senseId}:hold_30d`)),
		};
	});
	return pickReviewSenses(candidates, count, randomRng()).map((row) => row.senseId);
}

export async function countReviewEligible(userId: string): Promise<number> {
	return (await reviewSenseIds(userId, 10_000)).length;
}

async function senseIdsForMode(userId: string, mode: 'set' | 'mistakes' | 'review', setId?: string): Promise<string[]> {
	if (mode === 'set') {
		if (!setId) throw new AppError('Thiếu bộ học', 400);
		await assertEnrolled(userId, setId);
		const items = await prisma.enSetItem.findMany({
			where: { setId, sense: { status: 'published' } },
			orderBy: { position: 'asc' },
			select: { senseId: true },
		});
		return items.flatMap((item) => (item.senseId ? [item.senseId] : []));
	}
	if (mode === 'mistakes') {
		const rows = await prisma.enWordState.findMany({
			where: { userId, inMistakeBook: true, sense: { status: 'published' } },
			orderBy: { mistakeAddedAt: 'asc' },
			select: { senseId: true },
		});
		return rows.map((row) => row.senseId);
	}
	const blueprint = await getEnglishBlueprint();
	return reviewSenseIds(userId, blueprint.reviewWords);
}

export async function startEnglishPractice(userId: string, input: {
	mode: 'set' | 'mistakes' | 'review';
	setId?: string;
	activityKey?: string | null;
}) {
	if (input.activityKey && !isActivityKey(input.activityKey)) throw new AppError('Dạng bài không hợp lệ', 400);
	const senseIds = await senseIdsForMode(userId, input.mode, input.setId);
	const bundles = await getSenseBundles(senseIds, true);
	if (bundles.length === 0) throw new AppError('Chưa có từ để luyện', 400);
	const session = await prisma.enPracticeSession.create({
		data: {
			userId,
			mode: input.mode,
			setId: input.setId ?? null,
			activityKey: input.activityKey ?? null,
			senseIds: bundles.map((bundle) => bundle.sense.id),
		},
	});
	return { sessionId: session.id, activityKey: input.activityKey ?? null, bundles };
}

export async function finishEnglishPractice(userId: string, input: {
	sessionId: string;
	activeSeconds: number;
	senseIds: string[];
}) {
	const session = await prisma.enPracticeSession.findFirst({ where: { id: input.sessionId, userId } });
	if (!session) throw new AppError('Không tìm thấy phiên luyện', 404);
	if (session.endedAt) return { ok: true as const };
	const endedAt = new Date();
	const elapsed = Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000));
	const activeSeconds = Math.min(Math.max(0, Math.round(input.activeSeconds)), elapsed);
	const allowed = new Set(session.senseIds ?? []);
	const senseIds = [...new Set(input.senseIds.map((id) => id.trim()).filter((id) => id && allowed.has(id)))];
	const trackedSenseIds = senseIds;
	await prisma.$transaction(async (tx) => {
		for (const senseId of trackedSenseIds) {
			const existing = await tx.enWordState.findUnique({ where: { userId_senseId: { userId, senseId } } });
			const next = applyPracticeExposure(existing ? snapshot(existing) : emptyWordState(), endedAt);
			await tx.enWordState.upsert({
				where: { userId_senseId: { userId, senseId } },
				create: { userId, senseId, ...next },
				update: next,
			});
		}
		await tx.enPracticeSession.update({
			where: { id: session.id },
			data: { endedAt, activeSeconds, senseIds: trackedSenseIds },
		});
	}, { timeout: EN_TX_TIMEOUT_MS, maxWait: EN_TX_MAX_WAIT_MS });
	return { ok: true as const };
}

export async function listMistakeBook(userId: string) {
	const states = await prisma.enWordState.findMany({
		where: { userId, inMistakeBook: true, sense: { status: 'published' } },
		orderBy: { mistakeAddedAt: 'asc' },
		include: {
			sense: {
				select: {
					setItems: { select: { set: { select: { id: true, title: true } } } },
				},
			},
		},
	});
	const bundles = await getSenseBundles(states.map((state) => state.senseId), true);
	const byId = new Map(states.map((state) => [state.senseId, state]));
	const today = new Date();
	return bundles.map((bundle) => {
		const state = byId.get(bundle.sense.id);
		const studiedToday = Boolean(state?.lastExposureAt && vnDayKey(state.lastExposureAt) === vnDayKey(today));
		const set = state?.sense.setItems[0]?.set ?? null;
		return {
			senseId: bundle.sense.id,
			lemma: bundle.word.lemma,
			ipa: bundle.word.ipa,
			meaningVi: bundle.sense.meaningVi,
			studiedToday,
			setId: set?.id ?? null,
			setTitle: set?.title ?? 'Bộ khác',
			bundle,
		};
	});
}
