import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';
type Ctx = { params: Promise<{ rewardId: string }> };
export const PATCH = withAuth(async (_request, user, ctx) => {
	const { rewardId } = await (ctx as Ctx).params;
	return apiSuccess(await prisma.enReward.updateMany({ where: { id: rewardId, userId: user.id, unlockedAt: { not: null }, claimedAt: null }, data: { claimedAt: new Date() } }));
});
