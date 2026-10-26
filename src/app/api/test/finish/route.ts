import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { finishEnglishTest } from '@/services/english/enTestService';

const bodySchema = z.object({ attemptId: z.string().min(1) }).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thiếu bài kiểm tra', 400);
	const result = await finishEnglishTest(user.id, parsed.data.attemptId);
	return apiSuccess(result);
});
