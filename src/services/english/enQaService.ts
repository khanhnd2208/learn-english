import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';

const DAY_MS = 86_400_000;

export function englishQaToolsEnabled(): boolean {
	return process.env.NODE_ENV !== 'production' || process.env.ENGLISH_QA_TOOLS === '1';
}

async function sensesInSet(setId: string): Promise<string[]> {
	const set = await prisma.enSet.findUnique({ where: { id: setId }, select: { items: { select: { senseId: true } } } });
	if (!set) throw new AppError('Không tìm thấy bộ từ', 404);
	return set.items.flatMap((item) => item.senseId ? [item.senseId] : []);
}

function oneDayEarlier(value: Date | null): Date | null {
	return value ? new Date(value.getTime() - DAY_MS) : null;
}

/** Pretends a day has passed for the admin's own words in a set: due dates, reviews and tests move one day back. */
export async function shiftEnglishQaDataOneDay(userId: string, setId: string) {
	const senseIds = await sensesInSet(setId);
	const [states, reviews, attempts] = await Promise.all([
		prisma.enWordState.findMany({ where: { userId, senseId: { in: senseIds } } }),
		prisma.enReview.findMany({ where: { userId, senseId: { in: senseIds } }, select: { id: true, at: true } }),
		prisma.enTestAttempt.findMany({ where: { userId, setId } }),
	]);
	await prisma.$transaction([
		...states.map((state) => prisma.enWordState.update({
			where: { id: state.id },
			data: { dueAt: oneDayEarlier(state.dueAt)!, introducedAt: oneDayEarlier(state.introducedAt)!, lastReviewedAt: oneDayEarlier(state.lastReviewedAt) },
		})),
		...reviews.map((review) => prisma.enReview.update({ where: { id: review.id }, data: { at: oneDayEarlier(review.at)! } })),
		...attempts.map((attempt) => prisma.enTestAttempt.update({ where: { id: attempt.id }, data: { startedAt: oneDayEarlier(attempt.startedAt)!, finishedAt: oneDayEarlier(attempt.finishedAt) } })),
	]);
	return { shiftedStates: states.length, shiftedReviews: reviews.length, shiftedTests: attempts.length };
}

export async function resetEnglishQaProgress(userId: string, setId: string) {
	const senseIds = await sensesInSet(setId);
	const [states, reviews, attempts] = await prisma.$transaction([
		prisma.enWordState.deleteMany({ where: { userId, senseId: { in: senseIds } } }),
		prisma.enReview.deleteMany({ where: { userId, senseId: { in: senseIds } } }),
		prisma.enTestAttempt.deleteMany({ where: { userId, setId } }),
	]);
	return { deletedStates: states.count, deletedReviews: reviews.count, deletedTestAttempts: attempts.count };
}
