import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { finishToday } from '@/services/english/enDailyService';
import { safeSettle } from '@/services/english/enGoalService';

const bodySchema = z.object({ sessionId: z.string().min(1) }).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Không kết thúc được phiên học', 400);
	const result = await finishToday(user.id, parsed.data.sessionId);
	return apiSuccess({ ...result, reward: await safeSettle(user.id) });
});
