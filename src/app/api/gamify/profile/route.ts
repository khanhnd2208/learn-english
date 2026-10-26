import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';
const schema = z.object({ goal: z.enum(['communication', 'work', 'travel', 'exam', 'other']), targetCefr: z.enum(['pre_a1', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2']).nullable(), weeklyDaysGoal: z.number().int().min(2).max(7), avatarKey: z.string().min(1).max(40) }).strict();
export const GET = withAuth(async (_request, user) => apiSuccess(await prisma.enLearnerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })));
export const PATCH = withAuth(async (request, user) => {
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Hồ sơ chưa hợp lệ', 400);
	return apiSuccess(await prisma.enLearnerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...parsed.data }, update: parsed.data }));
});
