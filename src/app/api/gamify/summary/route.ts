import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';
import { vnDayKey } from '@/lib/english/gapRule';

export const GET = withAuth(async (_request, user) => {
	const today = vnDayKey(new Date());
	const start = new Date(`${today}T00:00:00+07:00`);
	const end = new Date(start.getTime() + 86_400_000);
	const [todayXp, held, mastered] = await Promise.all([
		prisma.enXpEvent.aggregate({ where: { userId: user.id, createdAt: { gte: start, lt: end } }, _sum: { amount: true } }),
		prisma.enXpEvent.count({ where: { userId: user.id, kind: { in: ['hold_7d', 'hold_30d'] }, createdAt: { gte: start, lt: end } } }),
		prisma.enWordState.count({ where: { userId: user.id, status: 'mastered' } }),
	]);
	return apiSuccess({ todayXp: todayXp._sum.amount ?? 0, held, mastered });
});
