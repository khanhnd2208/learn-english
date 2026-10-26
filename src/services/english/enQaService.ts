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

export async function shiftEnglishQaDataOneDay(userId: string, setId: string) {
	const senseIds = await sensesInSet(setId);
	const [states, practices, attempts] = await Promise.all([
		prisma.enWordState.findMany({ where: { userId, senseId: { in: senseIds } } }),
		prisma.enPracticeSession.findMany({ where: { userId, setId } }),
		prisma.enTestAttempt.findMany({ where: { userId, setId } }),
	]);
	await prisma.$transaction([
		...states.map((state) => prisma.enWordState.update({ where: { id: state.id }, data: { lastExposureAt: oneDayEarlier(state.lastExposureAt), lastTestedAt: oneDayEarlier(state.lastTestedAt), mistakeAddedAt: oneDayEarlier(state.mistakeAddedAt) } })),
		...practices.map((session) => prisma.enPracticeSession.update({ where: { id: session.id }, data: { startedAt: oneDayEarlier(session.startedAt)!, endedAt: oneDayEarlier(session.endedAt) } })),
		...attempts.map((attempt) => prisma.enTestAttempt.update({ where: { id: attempt.id }, data: { startedAt: oneDayEarlier(attempt.startedAt)!, finishedAt: oneDayEarlier(attempt.finishedAt) } })),
	]);
	return { shiftedStates: states.length, shiftedSessions: practices.length + attempts.length };
}

export async function resetEnglishQaProgress(userId: string, setId: string) {
	const senseIds = await sensesInSet(setId);
	const [states, practices, attempts] = await prisma.$transaction([
		prisma.enWordState.deleteMany({ where: { userId, senseId: { in: senseIds } } }),
		prisma.enPracticeSession.deleteMany({ where: { userId, setId } }),
		prisma.enTestAttempt.deleteMany({ where: { userId, setId } }),
	]);
	return { deletedStates: states.count, deletedPracticeSessions: practices.count, deletedTestAttempts: attempts.count };
}
