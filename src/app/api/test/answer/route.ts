import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { answerEnglishTest } from '@/services/english/enTestService';

const bodySchema = z.object({
	attemptId: z.string().min(1),
	itemId: z.string().min(1),
	answer: z.string(),
	responseMs: z.number(),
}).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Câu trả lời không hợp lệ', 400);
	const result = await answerEnglishTest(user.id, parsed.data);
	return apiSuccess(result);
});
