import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { answerToday } from '@/services/english/enDailyService';

const bodySchema = z.object({
	sessionId: z.string().min(1),
	senseId: z.string().min(1),
	answer: z.string().max(500),
	prompt: z.enum(['meaning', 'cloze', 'listen']).optional(),
	responseMs: z.number().int().nonnegative().optional(),
	giveUp: z.boolean().optional(),
	typoChecked: z.boolean().optional(),
}).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Câu trả lời không hợp lệ', 400);
	return apiSuccess(await answerToday(user.id, parsed.data));
});
