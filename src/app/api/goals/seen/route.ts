import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { markGoalsSeen } from '@/services/english/enGoalService';

const bodySchema = z.object({ level: z.number().int().nonnegative().max(10_000) }).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Dữ liệu không hợp lệ', 400);
	return apiSuccess(await markGoalsSeen(user.id, parsed.data));
});
