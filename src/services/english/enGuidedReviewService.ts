import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { activityByKey, randomRng, type ActivityItem } from '@/lib/english/activities';
import { EN_GUIDED_CHUNK_SIZE } from '@/lib/english/constants';
import { buildGuidedQuestions, buildRetryQuestion, weightedOrder, type ReviewHistory } from '@/lib/english/guidedReview';
import { vnDayKey } from '@/lib/english/gapRule';
import { vnDayStart } from '@/lib/english/schedule';
import { pacedEnough, XP } from '@/lib/english/xp';
import { warmBundleSpeech } from '@/services/english/enAudioService';
import { getSenseBundles } from '@/services/english/enContentService';

type QuestionRow = {
	id: string;
	position: number;
	senseId: string;
	activityKey: string;
	prompt: Prisma.JsonValue;
	layout: Prisma.JsonValue | null;
	answerKey: string;
	answer: string | null;
	correct: boolean | null;
};

function publicQuestion(question: QuestionRow) {
	return {
		id: question.id,
		position: question.position,
		senseId: question.senseId,
		activityKey: question.activityKey,
		prompt: question.prompt as Record<string, unknown>,
		layout: question.layout,
		answer: question.answer,
		correct: question.correct,
		expected: question.answer !== null ? question.answerKey : null,
	};
}

async function enrolledSets(userId: string) {
	return prisma.enSet.findMany({
		where: { status: 'published', enrollments: { some: { userId } } },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		select: {
			id: true,
			title: true,
			items: { where: { sense: { status: 'published' } }, select: { senseId: true } },
		},
	});
}

async function selectedSenseIds(userId: string, selectedSetIds: string[]) {
	const sets = await enrolledSets(userId);
	const allowed = new Set(sets.map((set) => set.id));
	const selected = [...new Set(selectedSetIds)].filter((setId) => allowed.has(setId));
	if (!selected.length) throw new AppError('Hãy chọn ít nhất một bộ từ', 400);
	const senses = [...new Set(sets.filter((set) => selected.includes(set.id)).flatMap((set) => set.items.flatMap((item) => item.senseId ? [item.senseId] : [])))];
	if (!senses.length) throw new AppError('Các bộ đã chọn chưa có từ hợp lệ', 400);
	return { selected, senses };
}

/** SRS mistakes only: the first attempt of each word per daily session, newest 20 per word. */
async function histories(userId: string, senseIds: string[]): Promise<ReviewHistory[]> {
	const reviews = await prisma.enReview.findMany({
		where: { userId, senseId: { in: senseIds } },
		orderBy: { at: 'asc' },
		select: { sessionId: true, senseId: true, correct: true, at: true },
	});
	const first = new Map<string, { senseId: string; correct: boolean; at: Date }>();
	for (const row of reviews) {
		const key = `${row.sessionId}:${row.senseId}`;
		if (!first.has(key)) first.set(key, row);
	}
	const bySense = new Map<string, boolean[]>();
	for (const row of [...first.values()].sort((x, y) => y.at.getTime() - x.at.getTime())) {
		const values = bySense.get(row.senseId) ?? [];
		values.push(row.correct);
		bySense.set(row.senseId, values);
	}
	return senseIds.map((senseId) => {
		const recent = (bySense.get(senseId) ?? []).slice(0, 20);
		return { senseId, recentWrong: recent.filter((correct) => !correct).length, recentTotal: recent.length };
	});
}

async function questionInputs(chunkNumber: number, chunkIds: string[], poolIds: string[]) {
	const bundles = await getSenseBundles(poolIds, true);
	const byId = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
	const chunk = chunkIds.flatMap((senseId) => byId.get(senseId) ? [byId.get(senseId)!] : []);
	const questions = buildGuidedQuestions(chunk, bundles, randomRng());
	if (questions.length !== chunk.length) throw new AppError('Không dựng được đủ câu hỏi cho chặng này', 400);
	return questions.map((question, position) => ({
			chunkNumber,
			kind: 'main',
			position,
			senseId: question.senseId,
			role: question.role,
			activityKey: question.activityKey,
			prompt: question.prompt as Prisma.InputJsonValue,
			answerKey: question.answerKey,
			accepted: question.accepted,
			layout: question.layout as unknown as Prisma.InputJsonValue,
		}));
}

async function serializeSession(userId: string, sessionId: string) {
	const session = await prisma.enGuidedReviewSession.findFirst({ where: { id: sessionId, userId } });
	if (!session) throw new AppError('Không tìm thấy phiên ôn tập', 404);
	const questions = await prisma.enGuidedReviewQuestion.findMany({
		where: { sessionId: session.id, chunkNumber: session.chunkNumber },
		orderBy: [{ kind: 'asc' }, { position: 'asc' }],
	});
	const bundles = await getSenseBundles(session.currentChunkSenseIds, true);
	if (!session.endedAt) warmBundleSpeech(bundles);
	const main = questions.filter((question) => question.kind === 'main');
	const retry = questions.filter((question) => question.kind === 'retry');
	return {
		id: session.id,
		phase: session.phase,
		chunkNumber: session.chunkNumber,
		studyPosition: session.studyPosition,
		questionPosition: session.questionPosition,
		selectedSetIds: session.selectedSetIds,
		poolSize: session.poolSenseIds.length,
		remainingCount: session.remainingSenseIds.length,
		words: session.currentChunkSenseIds.flatMap((senseId) => bundles.find((bundle) => bundle.sense.id === senseId) ?? []),
		questions: (session.phase === 'retry' ? retry : main).map(publicQuestion),
		mainResults: main.filter((question) => question.answer !== null).map((question) => ({ senseId: question.senseId, correct: question.correct === true })),
		retryCompleted: retry.length > 0 && retry.every((question) => question.answer !== null),
		endedAt: session.endedAt?.toISOString() ?? null,
	};
}

export async function getGuidedReviewOverview(userId: string, now = new Date()) {
	const [sets, preference, practicedToday] = await Promise.all([
		enrolledSets(userId),
		prisma.enReviewPreference.findUnique({ where: { userId } }),
		prisma.enGuidedReviewQuestion.count({
			where: { kind: 'main', answer: { not: null }, answeredAt: { gte: vnDayStart(vnDayKey(now)) }, session: { userId } },
		}),
	]);
	const defaultIds = sets.map((set) => set.id);
	const selectedSetIds = preference ? preference.selectedSetIds.filter((id) => defaultIds.includes(id)) : defaultIds;
	const selected = new Set(selectedSetIds);
	const uniqueWords = new Set(sets.filter((set) => selected.has(set.id)).flatMap((set) => set.items.flatMap((item) => item.senseId ? [item.senseId] : []))).size;
	return {
		sets: sets.map((set) => ({ id: set.id, title: set.title, words: new Set(set.items.flatMap((item) => item.senseId ? [item.senseId] : [])).size })),
		selectedSetIds,
		uniqueWords,
		practicedToday,
	};
}

export async function saveGuidedReviewSelection(userId: string, setIds: string[]) {
	const sets = await enrolledSets(userId);
	const allowed = new Set(sets.map((set) => set.id));
	const selected = [...new Set(setIds)].filter((setId) => allowed.has(setId));
	await prisma.enReviewPreference.upsert({
		where: { userId },
		create: { userId, selectedSetIds: selected },
		update: { selectedSetIds: selected },
	});
	return getGuidedReviewOverview(userId);
}

/** Every start is a fresh run: a session left mid-way is closed, never resumed. */
export async function startGuidedReview(userId: string, setIds: string[]) {
	const active = await prisma.enGuidedReviewSession.findUnique({ where: { activeKey: userId } });
	if (active) await abandonGuidedReview(userId, active.id);
	const { selected, senses } = await selectedSenseIds(userId, setIds);
	const order = weightedOrder(senses, await histories(userId, senses), randomRng());
	const chunk = order.slice(0, EN_GUIDED_CHUNK_SIZE);
	const questions = await questionInputs(1, chunk, order);
	let session;
	try {
		session = await prisma.enGuidedReviewSession.create({
			data: {
				userId,
				activeKey: userId,
				selectedSetIds: selected,
				poolSenseIds: order,
				remainingSenseIds: order.slice(chunk.length),
				currentChunkSenseIds: chunk,
				questions: { create: questions },
			},
		});
	} catch (cause) {
		if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
			const concurrent = await prisma.enGuidedReviewSession.findUnique({ where: { activeKey: userId } });
			if (concurrent) return serializeSession(userId, concurrent.id);
		}
		throw cause;
	}
	await prisma.enReviewPreference.upsert({ where: { userId }, create: { userId, selectedSetIds: selected }, update: { selectedSetIds: selected } });
	const serialized = await serializeSession(userId, session.id);
	// After the current chunk, prepare the rest of the selection in the order it will be studied.
	void getSenseBundles(order, true).then(warmBundleSpeech).catch(() => undefined);
	return serialized;
}

async function activeSession(userId: string, sessionId: string) {
	const session = await prisma.enGuidedReviewSession.findFirst({ where: { id: sessionId, userId, endedAt: null } });
	if (!session) throw new AppError('Phiên ôn tập không còn hoạt động', 409);
	return session;
}

export async function saveStudyPosition(userId: string, sessionId: string, position: number) {
	const session = await activeSession(userId, sessionId);
	if (session.phase !== 'study') return serializeSession(userId, session.id);
	const next = Math.max(session.studyPosition, Math.min(session.currentChunkSenseIds.length, position));
	await prisma.enGuidedReviewSession.updateMany({
		where: { id: session.id, phase: 'study', studyPosition: { lt: next } },
		data: { studyPosition: next, ...(next >= session.currentChunkSenseIds.length ? { phase: 'quiz', questionPosition: 0 } : {}) },
	});
	return serializeSession(userId, session.id);
}

export async function answerGuidedReview(userId: string, sessionId: string, questionId: string, answer: string, responseMs: number) {
	const session = await activeSession(userId, sessionId);
	if (!['quiz', 'retry'].includes(session.phase)) throw new AppError('Chưa đến phần câu hỏi', 409);
	const question = await prisma.enGuidedReviewQuestion.findFirst({ where: { id: questionId, sessionId: session.id, chunkNumber: session.chunkNumber } });
	if (!question || question.kind !== (session.phase === 'retry' ? 'retry' : 'main')) throw new AppError('Không tìm thấy câu hỏi', 404);
	if (question.answer !== null) return { questionId, answer: question.answer, correct: question.correct === true, expected: question.answerKey, xp: 0, session: await serializeSession(userId, session.id) };
	const item: ActivityItem = { activityKey: question.activityKey as ActivityItem['activityKey'], role: question.role as ActivityItem['role'], senseId: question.senseId, prompt: question.prompt as Record<string, unknown>, answerKey: question.answerKey, accepted: question.accepted };
	const activity = activityByKey(question.activityKey);
	if (!activity) console.warn('Unsupported guided review activity:', question.activityKey);
	const correct = answer.trim() !== '' && Boolean(activity?.grade(item, answer));
	let xp = 0;
	let persisted = false;
	const now = new Date();
	await prisma.$transaction(async (tx) => {
		// Spacing is judged by server time against the previous answer of this session, never by the client's responseMs.
		const last = await tx.enGuidedReviewQuestion.findFirst({ where: { sessionId: session.id, answeredAt: { not: null } }, orderBy: { answeredAt: 'desc' }, select: { answeredAt: true } });
		const paced = pacedEnough(last?.answeredAt ?? session.startedAt, now);
		const saved = await tx.enGuidedReviewQuestion.updateMany({ where: { id: question.id, answer: null }, data: { answer, correct, responseMs: Math.max(0, Math.min(120_000, Math.trunc(responseMs))), answeredAt: now } });
		if (!saved.count) return;
		persisted = true;
		if (question.kind === 'main') await tx.enStudyDay.createMany({ data: [{ userId, day: vnDayKey(now) }], skipDuplicates: true });
		if (question.kind === 'main' && correct && paced) {
			const day = vnDayKey(now);
			// Review and extra SRS rounds share one daily cap, both stored as kind `extra`.
			const earned = await tx.enXpEvent.aggregate({ where: { userId, day, kind: 'extra' }, _sum: { xp: true } });
			if ((earned._sum.xp ?? 0) + XP.review <= XP.reviewDailyCap) {
				const created = await tx.enXpEvent.createMany({ data: [{ userId, day, at: now, sourceKey: `guided:${question.id}`, kind: 'extra', xp: XP.review }], skipDuplicates: true });
				if (created.count) xp = XP.review;
			}
		}
		const [remaining, total] = await Promise.all([
			tx.enGuidedReviewQuestion.count({ where: { sessionId: session.id, chunkNumber: session.chunkNumber, kind: question.kind, answer: null } }),
			tx.enGuidedReviewQuestion.count({ where: { sessionId: session.id, chunkNumber: session.chunkNumber, kind: question.kind } }),
		]);
		await tx.enGuidedReviewSession.update({ where: { id: session.id }, data: remaining === 0 ? { phase: 'summary', questionPosition: 0 } : { questionPosition: total - remaining } });
	});
	if (!persisted) {
		const saved = await prisma.enGuidedReviewQuestion.findUnique({ where: { id: question.id } });
		if (saved?.answer !== null && saved?.answer !== undefined) return { questionId, answer: saved.answer, correct: saved.correct === true, expected: saved.answerKey, xp: 0, session: await serializeSession(userId, session.id) };
	}
	return { questionId, answer, correct, expected: question.answerKey, xp, session: await serializeSession(userId, session.id) };
}

export async function startGuidedRetry(userId: string, sessionId: string) {
	const session = await activeSession(userId, sessionId);
	if (session.phase !== 'summary') return serializeSession(userId, session.id);
	const main = await prisma.enGuidedReviewQuestion.findMany({ where: { sessionId: session.id, chunkNumber: session.chunkNumber, kind: 'main', correct: false }, orderBy: { position: 'asc' } });
	if (!main.length) return serializeSession(userId, session.id);
	const existing = await prisma.enGuidedReviewQuestion.count({ where: { sessionId: session.id, chunkNumber: session.chunkNumber, kind: 'retry' } });
	if (!existing) {
		const rng = randomRng();
		const bundles = await getSenseBundles(session.poolSenseIds, true);
		const byId = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
		const retries = rng.shuffle(main).flatMap((question) => {
			const bundle = byId.get(question.senseId);
			const retry = bundle && buildRetryQuestion(bundle, bundles, question.activityKey, rng);
			return retry ? [{ question, retry }] : [];
		});
		await prisma.enGuidedReviewQuestion.createMany({ data: retries.map(({ retry }, position) => ({ sessionId: session.id, chunkNumber: session.chunkNumber, kind: 'retry', position, senseId: retry.senseId, role: retry.role, activityKey: retry.activityKey, prompt: retry.prompt as Prisma.InputJsonValue, answerKey: retry.answerKey, accepted: retry.accepted, layout: retry.layout as unknown as Prisma.InputJsonValue })), skipDuplicates: true });
	}
	await prisma.enGuidedReviewSession.update({ where: { id: session.id }, data: { phase: 'retry', questionPosition: 0 } });
	return serializeSession(userId, session.id);
}

export async function nextGuidedChunk(userId: string, sessionId: string, restart: boolean) {
	const session = await activeSession(userId, sessionId);
	if (session.phase !== 'summary') return serializeSession(userId, session.id);
	let remaining = session.remainingSenseIds;
	if (!remaining.length) {
		if (!restart) throw new AppError('Bạn đã đi hết các từ đã chọn', 409);
		remaining = weightedOrder(session.poolSenseIds, await histories(userId, session.poolSenseIds), randomRng());
	}
	const chunk = remaining.slice(0, EN_GUIDED_CHUNK_SIZE);
	const chunkNumber = session.chunkNumber + 1;
	const questions = await questionInputs(chunkNumber, chunk, session.poolSenseIds);
	const advanced = await prisma.$transaction(async (tx) => {
		const updated = await tx.enGuidedReviewSession.updateMany({ where: { id: session.id, phase: 'summary', chunkNumber: session.chunkNumber }, data: { remainingSenseIds: remaining.slice(chunk.length), currentChunkSenseIds: chunk, chunkNumber, phase: 'study', studyPosition: 0, questionPosition: 0 } });
		if (!updated.count) return false;
		await tx.enGuidedReviewQuestion.createMany({ data: questions.map((input) => ({ ...input, sessionId: session.id })), skipDuplicates: true });
		return true;
	});
	if (!advanced) return serializeSession(userId, session.id);
	return serializeSession(userId, session.id);
}

export async function finishGuidedReview(userId: string, sessionId: string) {
	const session = await prisma.enGuidedReviewSession.findFirst({ where: { id: sessionId, userId } });
	if (!session) throw new AppError('Không tìm thấy phiên ôn tập', 404);
	if (!session.endedAt) {
		const sums = await prisma.enGuidedReviewQuestion.aggregate({ where: { sessionId: session.id }, _sum: { responseMs: true } });
		await prisma.enGuidedReviewSession.update({ where: { id: session.id }, data: { activeKey: null, phase: 'finished', endedAt: new Date(), activeSeconds: Math.ceil((sums._sum.responseMs ?? 0) / 1000) } });
	}
	return { ok: true as const };
}

export async function abandonGuidedReview(userId: string, sessionId: string) {
	const session = await prisma.enGuidedReviewSession.findFirst({ where: { id: sessionId, userId } });
	if (!session) throw new AppError('Không tìm thấy phiên ôn tập', 404);
	if (session.endedAt) return { ok: true as const };
	const answered = await prisma.enGuidedReviewQuestion.count({ where: { sessionId: session.id, answer: { not: null } } });
	if (answered === 0) {
		await prisma.enGuidedReviewSession.delete({ where: { id: session.id } });
		return { ok: true as const };
	}
	return finishGuidedReview(userId, sessionId);
}
