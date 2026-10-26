import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { finishEnglishPractice } from '@/services/english/enPracticeService';

const bodySchema = z.object({
	sessionId: z.string().min(1),
	activeSeconds: z.number().int().nonnegative(),
	senseIds: z.array(z.string().min(1)).max(500),
}).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Không kết thúc được phiên luyện', 400);
	const result = await finishEnglishPractice(user.id, parsed.data);
	return apiSuccess(result);
});
