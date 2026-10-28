import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_APPEAL_WINDOW_DAYS, correctBox, restoredSchedule, type AppealStatus } from '@/lib/english/appeal';
import { EN_TX_MAX_WAIT_MS, EN_TX_TIMEOUT_MS } from '@/lib/english/constants';
import { getSenseBundles } from '@/services/english/enContentService';

const DAY_MS = 86_400_000;

export type AppealRow = {
	id: string;
	status: AppealStatus;
	answer: string;
	expected: string;
	note: string;
	userName: string;
	userEmail: string;
	createdAt: string;
	resolvedAt: string | null;
	restored: boolean;
	word: { lemma: string; meaningVi: string; partOfSpeech: string; synonyms: string[]; forms: string[] } | null;
};

/** Only a wrong, typed answer from the learner's own SRS review can be appealed, once. */
export async function createAppeal(user: { id: string; name: string; email: string }, input: { reviewId: string; answer: string; note?: string }, now = new Date()) {
	const answer = input.answer.trim();
	if (!answer) throw new AppError('Chỉ khiếu nại được khi bạn đã gõ đáp án', 400);
	const review = await prisma.enReview.findFirst({ where: { id: input.reviewId, userId: user.id } });
	if (!review) throw new AppError('Không tìm thấy câu trả lời này', 404);
	if (review.correct) throw new AppError('Câu này đã được tính đúng', 409);
	if (now.getTime() - review.at.getTime() > EN_APPEAL_WINDOW_DAYS * DAY_MS) throw new AppError('Đã quá hạn gửi khiếu nại', 409);
	if (await prisma.enAnswerAppeal.findUnique({ where: { reviewId: review.id }, select: { id: true } })) throw new AppError('Bạn đã gửi khiếu nại cho câu này', 409);
	const bundle = (await getSenseBundles([review.senseId], true))[0];
	try {
		await prisma.enAnswerAppeal.create({ data: { reviewId: review.id, userId: user.id, userName: user.name, userEmail: user.email, senseId: review.senseId, answer, expected: bundle?.word.lemma ?? '', note: (input.note ?? '').trim().slice(0, 300) } });
	} catch (cause) {
		if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') throw new AppError('Bạn đã gửi khiếu nại cho câu này', 409);
		throw cause;
	}
	return { ok: true as const };
}

export async function listAppeals(status: AppealStatus): Promise<AppealRow[]> {
	const rows = await prisma.enAnswerAppeal.findMany({ where: { status }, orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' }, take: 100 });
	const bundles = await getSenseBundles([...new Set(rows.map((row) => row.senseId))], true);
	const bySense = new Map(bundles.map((bundle) => [bundle.sense.id, bundle]));
	return rows.map((row) => {
		const bundle = bySense.get(row.senseId);
		return {
			id: row.id, status: row.status as AppealStatus, answer: row.answer, expected: row.expected, note: row.note, userName: row.userName, userEmail: row.userEmail,
			createdAt: row.createdAt.toISOString(), resolvedAt: row.resolvedAt?.toISOString() ?? null, restored: row.restored,
			word: bundle ? { lemma: bundle.word.lemma, meaningVi: bundle.sense.meaningVi, partOfSpeech: bundle.sense.partOfSpeech, synonyms: bundle.sense.synonyms, forms: bundle.word.forms } : null,
		};
	});
}

export async function countPendingAppeals(): Promise<number> {
	return prisma.enAnswerAppeal.count({ where: { status: 'pending' } });
}

/** Accepting marks the review correct and gives back the schedule a correct answer would have earned. */
export async function resolveAppeal(adminId: string, input: { id: string; decision: 'accepted' | 'rejected' }, now = new Date()) {
	return prisma.$transaction(async (tx) => {
		const appeal = await tx.enAnswerAppeal.findUnique({ where: { id: input.id } });
		if (!appeal) throw new AppError('Không tìm thấy khiếu nại', 404);
		if (appeal.status !== 'pending') throw new AppError('Khiếu nại này đã được xử lý', 409);
		let restored = false;
		if (input.decision === 'accepted') {
			const review = await tx.enReview.findUnique({ where: { id: appeal.reviewId } });
			if (review) {
				const state = await tx.enWordState.findUnique({ where: { userId_senseId: { userId: appeal.userId, senseId: appeal.senseId } } });
				const schedule = restoredSchedule(review, state, now);
				if (state && schedule) {
					await tx.enWordState.update({ where: { id: state.id }, data: schedule });
					restored = schedule.box > state.box || schedule.lapses < state.lapses;
				}
				await tx.enReview.update({ where: { id: review.id }, data: { correct: true, ...(review.scheduled ? { boxAfter: correctBox(review.boxBefore) } : {}) } });
			}
		}
		const updated = await tx.enAnswerAppeal.updateMany({ where: { id: appeal.id, status: 'pending' }, data: { status: input.decision, restored, resolvedAt: now, resolvedBy: adminId } });
		if (updated.count !== 1) throw new AppError('Khiếu nại này đã được xử lý', 409);
		return { id: appeal.id, status: input.decision, restored };
	}, { timeout: EN_TX_TIMEOUT_MS, maxWait: EN_TX_MAX_WAIT_MS });
}
