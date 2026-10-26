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
import { applyPracticeExposure } from '@/lib/english/wordState';
import { xpEventsForResult } from '@/lib/english/gamify/xp';
import { levelFromXp } from '@/lib/english/gamify/level';
import type { EnglishTestStart, FinishedEnglishTest } from '@/lib/english/testTypes';

const DAY_MS = 86_400_000;

function vnTodayStart(now = new Date()): Date {
	const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
	return new Date(`${day}T00:00:00+07:00`);
}

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

async function exposeAttempt(userId: string, attempt: EnTestAttempt & { items: EnTestItem[] }) {
	const sentIds = [...new Set(attempt.items.filter((item) => item.servedAt).map((item) => item.senseId))];
	if (!sentIds.length) return;
	const now = new Date();
	for (const senseId of sentIds) {
		const existing = await prisma.enWordState.findUnique({ where: { userId_senseId: { userId, senseId } } });
		const next = applyPracticeExposure(existing ? snapshot(existing) : emptyWordState(), now);
		await prisma.enWordState.upsert({ where: { userId_senseId: { userId, senseId } }, create: { userId, senseId, ...next }, update: next });
	}
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
				startedAt: { gte: vnTodayStart() },
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
	const todayStart = vnTodayStart();
	const cutoff = new Date(todayStart.getTime() - DAY_MS);
	await prisma.enTestAttempt.updateMany({
		where: { userId, status: 'in_progress', startedAt: { lt: cutoff } },
		data: { status: 'abandoned' },
	});
	const match = { userId, mode: input.mode, setId: input.setId ?? null, status: 'in_progress' as const };
	if (input.restart) {
		const current = await prisma.enTestAttempt.findFirst({ where: match, include: { items: true } });
		if (current && current.items) await exposeAttempt(userId, current);
		await prisma.enTestAttempt.updateMany({ where: match, data: { status: 'abandoned' } });
		if (current) throw new AppError('Bài kiểm tra đã được mở hôm nay. Quay lại ngày mai để kiểm tra lại; lần mở này không làm mất tiến bộ.', 409);
	} else {
		const existing = await prisma.enTestAttempt.findFirst({
			where: { ...match, startedAt: { gte: cutoff } },
			orderBy: { startedAt: 'desc' },
			include: { items: { orderBy: { position: 'asc' } } },
		});
		if (existing) {
			const phase = existing.recallLockedAt ? 'recognize' : 'recall';
			const phaseItems = existing.items.filter((item) => item.role === phase);
			const newlyServed = phaseItems.filter((item) => !item.servedAt);
			if (newlyServed.length) await prisma.enTestItem.updateMany({ where: { id: { in: newlyServed.map((item) => item.id) } }, data: { servedAt: new Date() } });
			return { attemptId: existing.id, items: publicItems(phaseItems), resumed: true, wordCount: existing.wordCount, phase };
		}
	}
	const abandonedToday = await prisma.enTestAttempt.findFirst({ where: { userId, mode: input.mode, setId: input.setId ?? null, status: 'abandoned', startedAt: { gte: todayStart } } });
	if (abandonedToday) throw new AppError('Bài này đã được mở hôm nay. Hãy quay lại ngày mai để kiểm tra lại.', 409);
	const completedToday = await prisma.enTestAttempt.findFirst({ where: { userId, mode: input.mode, setId: input.setId ?? null, status: 'finished', startedAt: { gte: todayStart } } });
	if (completedToday) throw new AppError('Bài kiểm tra từ này đã được tính hôm nay. Hãy quay lại sau khoảng cách phù hợp.', 409);
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
	const attemptStartedAt = new Date();
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
			startedAt: attemptStartedAt,
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
	const recallItems = attempt.items.filter((item) => item.role === 'recall');
	if (prisma.enTestItem?.updateMany) await prisma.enTestItem.updateMany({ where: { id: { in: recallItems.map((item) => item.id) } }, data: { servedAt: new Date() } });
	return { attemptId: attempt.id, items: publicItems(recallItems), resumed: false, wordCount: attempt.wordCount, phase: 'recall' };
}

export async function lockEnglishRecall(userId: string, attemptId: string) {
	const attempt = await prisma.enTestAttempt.findFirst({ where: { id: attemptId, userId, status: 'in_progress' }, include: { items: { orderBy: { position: 'asc' } } } });
	if (!attempt) throw new AppError('Không tìm thấy bài kiểm tra đang làm', 404);
	if (!attempt.recallLockedAt) {
		const recallItems = attempt.items.filter((item) => item.role === 'recall');
		if (recallItems.some((item) => item.answer === null)) throw new AppError('Hãy trả lời hoặc chọn “Tôi chưa nhớ” cho tất cả câu Tự nhớ trước khi khoá phần này.', 400);
		await prisma.enTestAttempt.update({ where: { id: attempt.id }, data: { recallLockedAt: new Date() } });
	}
	const recognizeItems = attempt.items.filter((item) => item.role === 'recognize');
	await prisma.enTestItem.updateMany({ where: { id: { in: recognizeItems.map((item) => item.id) } }, data: { servedAt: new Date() } });
	return { attemptId, items: publicItems(recognizeItems), phase: 'recognize' as const, wordCount: attempt.wordCount };
}

export async function answerEnglishTest(userId: string, input: {
	attemptId: string;
	itemId: string;
	answer: string;
	responseMs: number;
	leftPage?: boolean;
}) {
	const item = await prisma.enTestItem.findFirst({
		where: { id: input.itemId, attemptId: input.attemptId, servedAt: { not: null }, attempt: { userId, status: 'in_progress' } },
		include: { attempt: true },
	});
	if (!item) throw new AppError('Không sửa được câu này', 400);
	if (input.leftPage && item.role !== 'recall') throw new AppError('Chỉ câu Tự nhớ mới có trạng thái rời trang', 400);
	if (item.role === 'recall' && item.attempt.recallLockedAt) throw new AppError('Phần Tự nhớ đã được khoá', 400);
	await prisma.enTestItem.update({
		where: { id: item.id },
		data: {
			answer: input.answer.slice(0, 500),
			responseMs: clampResponseMs(input.responseMs),
			answeredAt: new Date(),
		},
	});
	if (input.leftPage) await prisma.enTestItem.update({ where: { id: item.id }, data: { leftPage: true } });
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
		if (!attempt.recallLockedAt) throw new AppError('Hãy hoàn thành phần Tự nhớ trước khi nộp bài', 400);
	if (attempt.items.some((item) => item.role === 'recognize' && !item.servedAt)) throw new AppError('Hãy hoàn thành phần Nhận ra trước khi nộp bài', 400);
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
			const recallLeft = items.some((item) => item.role === 'recall' && item.leftPage);
			const counted = !recallLeft && isCounted(prior, now, blueprint.minGapDays);
			const recallMs = recall && graded.get(recall.id) === true ? recall.responseMs : null;
			await tx.enTestWordResult.create({
				data: {
					attemptId: attempt.id,
					userId,
					senseId,
					passed,
					counted,
					voidReason: recallLeft ? 'left_page' : null,
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
			if (passed && counted && existing?.inMistakeBook) {
				const profile = await tx.enLearnerProfile.findUnique({ where: { userId }, select: { rescuedSenses: true } });
				const rescuedSenses = [...new Set([...(profile?.rescuedSenses ?? []), senseId])];
				await tx.enLearnerProfile.upsert({ where: { userId }, create: { userId, rescuedSenses }, update: { rescuedSenses } });
			}
			if (passed && counted) {
				const history = await tx.enTestWordResult.findMany({ where: { userId, senseId, attemptId: { not: attempt.id } }, orderBy: { createdAt: 'asc' }, select: { passed: true, counted: true, createdAt: true } });
				const earned = await tx.enXpEvent.findMany({ where: { userId, senseId }, select: { kind: true } });
				const events = xpEventsForResult(history, { passed, counted, createdAt: now }, earned.map((event) => event.kind), now);
				if (events.length) {
					await tx.enXpEvent.createMany({ data: events.map((event) => ({ userId, senseId, kind: event.kind, amount: event.amount, attemptId: attempt.id })) });
					const beforeProfile = await tx.enLearnerProfile.findUnique({ where: { userId }, select: { totalXp: true } });
					const beforeXp = beforeProfile?.totalXp ?? 0;
					const amount = events.reduce((sum, event) => sum + event.amount, 0);
					await tx.enLearnerProfile.upsert({ where: { userId }, create: { userId, totalXp: amount }, update: { totalXp: { increment: amount } } });
					const oldTotal = await tx.enLearnerProfile.findUnique({ where: { userId }, select: { totalXp: true } });
					const oldLevel = levelFromXp(beforeXp);
					const newLevel = levelFromXp(oldTotal?.totalXp ?? amount);
					if (newLevel > oldLevel) await tx.enReward.updateMany({ where: { userId, unlockLevel: { lte: newLevel }, unlockedAt: null }, data: { unlockedAt: now } });
				}
			}
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
	if (attempt.status === 'in_progress') {
		const phase = attempt.recallLockedAt ? 'recognize' : 'recall';
		if (!attempt.recallLockedAt) {
			await prisma.enTestItem.updateMany({ where: { id: { in: attempt.items.filter((item) => item.role === 'recall').map((item) => item.id) } }, data: { servedAt: new Date() } });
		}
		return { attemptId: attempt.id, status: attempt.status, phase, items: publicItems(attempt.items.filter((item) => item.role === phase)), wordCount: attempt.wordCount };
	}
	return presentAttempt(attempt);
}

export async function getAttemptXp(userId: string, attemptId: string) {
	const attempt = await prisma.enTestAttempt.findFirst({ where: { id: attemptId, userId, status: 'finished' }, select: { id: true } });
	if (!attempt) throw new AppError('Không tìm thấy kết quả', 404);
	const [profile, earned] = await Promise.all([
		prisma.enLearnerProfile.findUnique({ where: { userId }, select: { totalXp: true } }),
		prisma.enXpEvent.findMany({ where: { userId, attemptId }, select: { kind: true, amount: true } }),
	]);
	const totalXp = profile?.totalXp ?? 0;
	return { totalXp, level: levelFromXp(totalXp), earned };
}

export function testMinutes(wordCount: number): number {
	return Math.max(1, Math.round((wordCount * 2 * 12) / 60));
}
