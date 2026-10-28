import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { createAppeal } from '@/services/english/enAppealService';

const bodySchema = z.object({ reviewId: z.string().min(1), answer: z.string().max(200), note: z.string().max(300).optional() }).strict();

/** "Đáp án của tôi cũng đúng" — only for wrong typed answers in Ôn luân phiên (SRS). */
export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Khiếu nại không hợp lệ', 400);
	return apiSuccess(await createAppeal(user, parsed.data), 201);
});
