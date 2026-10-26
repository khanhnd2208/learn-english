import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { startEnglishPractice } from '@/services/english/enPracticeService';

const bodySchema = z.object({
	mode: z.enum(['set', 'mistakes', 'review']),
	setId: z.string().min(1).optional(),
	activityKey: z.string().min(1).nullable().optional(),
}).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Phiên luyện không hợp lệ', 400);
	const session = await startEnglishPractice(user.id, parsed.data);
	return apiSuccess(session);
});
