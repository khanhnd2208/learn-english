import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { finishQuiz } from '@/services/english/enQuizService';
const schema = z.object({ attemptId: z.string().min(1) }).strict();
export const POST = withAuth(async (request, user) => { const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return apiError('Không tìm thấy bài kiểm tra', 400); return apiSuccess(await finishQuiz(user.id, parsed.data.attemptId)); });
