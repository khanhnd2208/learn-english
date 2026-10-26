import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { startQuiz } from '@/services/english/enQuizService';
const schema = z.object({ setId: z.string().min(1), kind: z.enum(['mcq', 'fill', 'listen']), restart: z.boolean().optional() }).strict();
export const POST = withAuth(async (request, user) => { const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return apiError('Bài kiểm tra không hợp lệ', 400); return apiSuccess(await startQuiz(user.id, parsed.data.setId, parsed.data.kind, parsed.data.restart)); });
