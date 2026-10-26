import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

const schema = z.object({ title: z.string().trim().min(1).max(120), unlockLevel: z.number().int().min(1).max(1000) }).strict();
export const GET = withAuth(async (_request, user) => apiSuccess(await prisma.enReward.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })));
export const POST = withAuth(async (request, user) => {
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Phần thưởng chưa hợp lệ', 400);
	return apiSuccess(await prisma.enReward.create({ data: { userId: user.id, ...parsed.data } }));
});
