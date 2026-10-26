import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { setDailyGoal } from '@/services/english/enGoalService';

const bodySchema = z.object({ xp: z.number().int() }).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Mục tiêu ngày không hợp lệ', 400);
	return apiSuccess(await setDailyGoal(user.id, parsed.data.xp));
});
