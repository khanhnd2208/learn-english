import { Prisma, type EnTestAttempt, type EnTestItem, type EnTestWordResult } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_TX_TIMEOUT_MS, EN_TX_MAX_WAIT_MS } from '@/lib/english/constants';
import { activityByKey, buildTest, poolFromBundles, randomRng, type ActivityItem } from '@/lib/english/activities';
import { isCounted } from '@/lib/english/gapRule';
import { applyTestResult, emptyWordState, wordPassed, type WordStateSnapshot } from '@/lib/english/wordState';
import { assertEnrolled } from '@/services/english/enCatalogService';
import { getSenseBundles } from '@/services/english/enContentService';
import { getEnglishBlueprint, listEnglishActivities, usableKinds } from '@/services/english/enActivityService';
import { reviewSenseIds } from '@/services/english/enPracticeService';
import type { EnglishTestStart, FinishedEnglishTest } from '@/lib/english/testTypes';

const DAY_MS = 86_400_000;

function json(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

function snapshot(row: {
	status: WordStateSnapshot['status'];
	lastExposureAt: Date | null;
	lastTestedAt: Date | null;
	masteredAt: Date | null;
	inMistakeBook: boolean;
	mistakeAddedAt: Date | null;
}): WordStateSnapshot {
	return { ...row };
}

function clampResponseMs(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(120_000, Math.max(0, Math.round(value)));
}

interface BlueprintSnapshot {
	recognizeKinds: string[];
	recallKinds: string[];
	maxWords: number;
	reviewWords: number;
	minGapDays: number;
	prior: Record<string, string | null>;
}

function readBlueprint(value: unknown): BlueprintSnapshot {
	const row = value && typeof value === 'object' ? value as Partial<BlueprintSnapshot> : {};
	return {
		recognizeKinds: Array.isArray(row.recognizeKinds) ? row.recognizeKinds.filter((item) => typeof item === 'string') : [],
		recallKinds: Array.isArray(row.recallKinds) ? row.recallKinds.filter((item) => typeof item === 'string') : [],
		maxWords: typeof row.maxWords === 'number' ? row.maxWords : 30,
		reviewWords: typeof row.reviewWords === 'number' ? row.reviewWords : 20,
		minGapDays: typeof row.minGapDays === 'number' ? row.minGapDays : 1,
		prior: row.prior && typeof row.prior === 'object' ? row.prior : {},
	};
}

async function selectSenseIds(userId: string, mode: 'set' | 'mistakes' | 'review', setId: string | undefined, limit: number): Promise<string[]> {
	if (mode === 'set') {
		if (!setId) throw new AppError('Thiếu bộ học', 400);
		await assertEnrolled(userId, setId);
		const items = await prisma.enSetItem.findMany({
			where: { setId, sense: { status: 'published' } },
			orderBy: { position: 'asc' },
			select: { senseId: true },
		});
		return items.flatMap((item) => (item.senseId ? [item.senseId] : [])).slice(0, limit);
	}
	if (mode === 'mistakes') {
		const rows = await prisma.enWordState.findMany({
			where: { userId, inMistakeBook: true, sense: { status: 'published' } },
			orderBy: { mistakeAddedAt: 'asc' },
			select: { senseId: true },
			take: limit,
		});
		return rows.map((row) => row.senseId);
	}
	return reviewSenseIds(userId, limit);
}

function publicItems(items: Array<{ id: string; position: number; activityKey: string; prompt: unknown; answer?: string | null }>) {
	return [...items]
		.sort((a, b) => a.position - b.position)
		.map((item) => ({
			id: item.id,
			position: item.position,
			activityKey: item.activityKey,
			prompt: (item.prompt && typeof item.prompt === 'object' ? item.prompt : {}) as Record<string, unknown>,
			answer: item.answer ?? null,
		}));
}

async function presentAttempt(attempt: EnTestAttempt & { items: EnTestItem[]; words: EnTestWordResult[] }): Promise<FinishedEnglishTest> {
	const senseIds = [...new Set(attempt.words.map((word) => word.senseId))];
	const senses = await prisma.enSense.findMany({
		where: { id: { in: senseIds } },
		select: { id: true, meaningVi: true, word: { select: { lemma: true } } },
	});
	const labels = new Map(senses.map((sense) => [sense.id, sense]));
	const words = attempt.words.map((word) => ({
		senseId: word.senseId,
		lemma: labels.get(word.senseId)?.word.lemma ?? '',
		meaningVi: labels.get(word.senseId)?.meaningVi ?? '',
		passed: word.passed,
		counted: word.counted,
		items: attempt.items
			.filter((item) => item.senseId === word.senseId)
			.sort((a, b) => a.position - b.position)
			.map((item) => ({
				id: item.id,
				role: item.role,
				activityKey: item.activityKey,
				prompt: item.prompt,
				answer: item.answer,
				correct: item.correct,
				answerKey: item.answerKey,
			})),
	}));
	return {
		attemptId: attempt.id,
		status: attempt.status,
		passedCount: attempt.passedCount ?? 0,
		wordCount: attempt.wordCount,
		words,
	};
}

export async function getEnglishTestStartInfo(userId: string, input: { mode: 'set' | 'mistakes' | 'review'; setId?: string }) {
	const blueprint = await getEnglishBlueprint();
	const limit = input.mode === 'review' ? blueprint.reviewWords : blueprint.maxWords;
	const [openAttempt, senseIds] = await Promise.all([
		prisma.enTestAttempt.findFirst({
			where: {
				userId,
				mode: input.mode,
				setId: input.setId ?? null,
				status: 'in_progress',
				startedAt: { gte: new Date(Date.now() - DAY_MS) },
			},
			orderBy: { startedAt: 'desc' },
			select: { id: true, wordCount: true, items: { select: { answer: true } } },
		}),
		selectSenseIds(userId, input.mode, input.setId, limit),
	]);
	return {
		wordCount: Math.min(limit, senseIds.length),
		openAttempt: openAttempt ? {
			attemptId: openAttempt.id,
			wordCount: openAttempt.wordCount,
			answeredCount: openAttempt.items.filter((item) => item.answer?.trim()).length,
			questionCount: openAttempt.items.length,
		} : null,
	};
}

export async function startEnglishTest(userId: string, input: { mode: 'set' | 'mistakes' | 'review'; setId?: string; restart?: boolean }): Promise<EnglishTestStart> {
	const cutoff = new Date(Date.now() - DAY_MS);
	await prisma.enTestAttempt.updateMany({
		where: { userId, status: 'in_progress', startedAt: { lt: cutoff } },
		data: { status: 'abandoned' },
	});
	const match = { userId, mode: input.mode, setId: input.setId ?? null, status: 'in_progress' as const };
	if (input.restart) {
		await prisma.enTestAttempt.updateMany({ where: match, data: { status: 'abandoned' } });
	} else {
		const existing = await prisma.enTestAttempt.findFirst({
			where: { ...match, startedAt: { gte: cutoff } },
			orderBy: { startedAt: 'desc' },
			include: { items: { orderBy: { position: 'asc' } } },
		});
		if (existing) {
			return { attemptId: existing.id, items: publicItems(existing.items), resumed: true, wordCount: existing.wordCount };
		}
	}
	const [blueprint, activities] = await Promise.all([getEnglishBlueprint(), listEnglishActivities()]);
	const recognizeKinds = usableKinds(blueprint.recognizeKinds, activities, 'recognize');
	const recallKinds = usableKinds(blueprint.recallKinds, activities, 'recall');
	if (recognizeKinds.length === 0 || recallKinds.length === 0) {
		throw new AppError('Cấu trúc bài kiểm tra chưa có dạng hợp lệ', 400);
	}
	const limit = input.mode === 'review' ? blueprint.reviewWords : blueprint.maxWords;
	const senseIds = await selectSenseIds(userId, input.mode, input.setId, limit);
	const selected = await getSenseBundles(senseIds, true);
	const byId = new Map(selected.map((bundle) => [bundle.sense.id, bundle]));
	const senses = senseIds.flatMap((id) => {
		const bundle = byId.get(id);
		return bundle ? [bundle] : [];
	});
	if (senses.length === 0) throw new AppError('Chưa có từ để kiểm tra', 400);
	const enrolledIds = input.mode === 'set' && input.setId
		? senseIds
		: (await prisma.enEnrollment.findMany({
			where: { userId },
			include: { set: { include: { items: { select: { senseId: true } } } } },
		})).flatMap((row) => row.set.items.flatMap((item) => (item.senseId ? [item.senseId] : [])));
	const outside = await getSenseBundles([...new Set(enrolledIds)], true);
	const poolBundles = [...senses];
	for (const bundle of outside) {
		if (!byId.has(bundle.sense.id)) poolBundles.push(bundle);
	}
	const inTest = new Set(senses.map((sense) => sense.sense.id));
	const sameSet = new Set(input.mode === 'set' ? senses.map((sense) => sense.sense.id) : []);
	const pool = poolFromBundles(poolBundles, { inTestIds: inTest, sameSetIds: sameSet });
	const built = buildTest({
		senses,
		recognizeKinds,
		recallKinds,
		pool,
		rng: randomRng(),
	});
	for (const drop of built.dropped) {
		console.warn(`[english] dropped sense ${drop.senseId} from test: no ${drop.role} item`);
	}
	if (built.items.length === 0) throw new AppError('Không dựng được bài kiểm tra từ các từ đã chọn', 400);
	const states = await prisma.enWordState.findMany({
		where: { userId, senseId: { in: [...new Set(built.items.map((item) => item.senseId))] } },
		select: { senseId: true, lastExposureAt: true },
	});
	const exposure = new Map(states.map((state) => [state.senseId, state.lastExposureAt]));
	const testedSenseIds = [...new Set(built.items.map((item) => item.senseId))];
	const prior: Record<string, string | null> = {};
	for (const senseId of testedSenseIds) prior[senseId] = exposure.get(senseId)?.toISOString() ?? null;
	const snapshotBlueprint: BlueprintSnapshot = {
		recognizeKinds,
		recallKinds,
		maxWords: blueprint.maxWords,
		reviewWords: blueprint.reviewWords,
		minGapDays: blueprint.minGapDays,
		prior,
	};
	const attempt = await prisma.enTestAttempt.create({
		data: {
			userId,
			mode: input.mode,
			setId: input.setId ?? null,
			blueprint: json(snapshotBlueprint),
			wordCount: testedSenseIds.length,
			items: {
				create: built.items.map((item, position) => ({
					senseId: item.senseId,
					position,
					role: item.role,
					activityKey: item.activityKey,
					prompt: json(item.prompt),
					answerKey: item.answerKey,
					accepted: item.accepted,
				})),
			},
		},
		include: { items: { orderBy: { position: 'asc' } } },
	});
	return { attemptId: attempt.id, items: publicItems(attempt.items), resumed: false, wordCount: attempt.wordCount };
}

export async function answerEnglishTest(userId: string, input: {
	attemptId: string;
	itemId: string;
	answer: string;
	responseMs: number;
}) {
	const item = await prisma.enTestItem.findFirst({
		where: { id: input.itemId, attemptId: input.attemptId, attempt: { userId, status: 'in_progress' } },
	});
	if (!item) throw new AppError('Không sửa được câu này', 400);
	await prisma.enTestItem.update({
		where: { id: item.id },
		data: {
			answer: input.answer.slice(0, 500),
			responseMs: clampResponseMs(input.responseMs),
			answeredAt: new Date(),
		},
	});
	return { ok: true as const };
}

function gradeItem(item: EnTestItem): boolean {
	if (!item.answer?.trim()) return false;
	const activity = activityByKey(item.activityKey);
	if (!activity?.grade) return false;
	const view: ActivityItem = {
		activityKey: activity.key,
		role: activity.role,
		senseId: item.senseId,
		prompt: (item.prompt && typeof item.prompt === 'object' ? item.prompt : {}) as Record<string, unknown>,
		answerKey: item.answerKey,
		accepted: item.accepted,
	};
	return activity.grade(view, item.answer);
}

export async function finishEnglishTest(userId: string, attemptId: string) {
	return prisma.$transaction(async (tx) => {
		const attempt = await tx.enTestAttempt.findFirst({
			where: { id: attemptId, userId },
			include: { items: true, words: true },
		});
		if (!attempt) throw new AppError('Không tìm thấy bài kiểm tra', 404);
		if (attempt.status === 'finished') return presentAttempt(attempt);
		if (attempt.status !== 'in_progress') throw new AppError('Bài này đã đóng', 400);
		const now = new Date();
		const blueprint = readBlueprint(attempt.blueprint);
		const graded = new Map<string, boolean>();
		for (const item of attempt.items) {
			const correct = gradeItem(item);
			graded.set(item.id, correct);
			await tx.enTestItem.update({
				where: { id: item.id },
				data: { correct },
			});
		}
		const senseIds = [...new Set(attempt.items.map((item) => item.senseId))];
		let passedCount = 0;
		for (const senseId of senseIds) {
			const items = attempt.items.filter((item) => item.senseId === senseId);
			const recognize = items.find((item) => item.role === 'recognize');
			const recall = items.find((item) => item.role === 'recall');
			const passed = wordPassed(recognize ? graded.get(recognize.id) === true : false, recall ? graded.get(recall.id) === true : false);
			if (passed) passedCount += 1;
			const priorRaw = blueprint.prior[senseId];
			const prior = priorRaw ? new Date(priorRaw) : null;
			const counted = isCounted(prior, attempt.startedAt, blueprint.minGapDays);
			const recallMs = recall && graded.get(recall.id) === true ? recall.responseMs : null;
			await tx.enTestWordResult.create({
				data: {
					attemptId: attempt.id,
					userId,
					senseId,
					passed,
					counted,
					priorExposureAt: prior,
					recallMs,
				},
			});
			const existing = await tx.enWordState.findUnique({ where: { userId_senseId: { userId, senseId } } });
			const next = applyTestResult(existing ? snapshot(existing) : emptyWordState(), { passed, counted }, now);
			await tx.enWordState.upsert({
				where: { userId_senseId: { userId, senseId } },
				create: { userId, senseId, ...next },
				update: next,
			});
		}
		const saved = await tx.enTestAttempt.update({
			where: { id: attempt.id },
			data: { status: 'finished', finishedAt: now, passedCount },
			include: { items: true, words: true },
		});
		return presentAttempt(saved);
	}, { timeout: EN_TX_TIMEOUT_MS, maxWait: EN_TX_MAX_WAIT_MS });
}

export async function getEnglishTest(userId: string, attemptId: string) {
	const attempt = await prisma.enTestAttempt.findFirst({
		where: { id: attemptId, userId },
		include: { items: true, words: true },
	});
	if (!attempt) throw new AppError('Không tìm thấy bài kiểm tra', 404);
	if (attempt.status === 'in_progress') return { attemptId: attempt.id, status: attempt.status, items: publicItems(attempt.items), wordCount: attempt.wordCount };
	return presentAttempt(attempt);
}

export function testMinutes(wordCount: number): number {
	return Math.max(1, Math.round((wordCount * 2 * 12) / 60));
}
