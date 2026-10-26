import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { QUIZ_KINDS } from '@/lib/english/quiz';
import { startQuiz } from '@/services/english/enQuizService';

const bodySchema = z.object({
	setId: z.string().min(1),
	kind: z.enum(QUIZ_KINDS),
	restart: z.boolean().optional(),
}).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Bài kiểm tra không hợp lệ', 400);
	return apiSuccess(await startQuiz(user.id, parsed.data.setId, parsed.data.kind, parsed.data.restart));
});
