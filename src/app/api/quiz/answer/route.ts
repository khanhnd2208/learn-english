import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { answerQuiz } from '@/services/english/enQuizService';

const bodySchema = z.object({
	attemptId: z.string().min(1),
	position: z.number().int().nonnegative(),
	answer: z.string().max(500),
	responseMs: z.number().finite().nonnegative(),
}).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Câu trả lời không hợp lệ', 400);
	return apiSuccess(await answerQuiz(user.id, parsed.data.attemptId, parsed.data.position, parsed.data.answer, parsed.data.responseMs));
});
