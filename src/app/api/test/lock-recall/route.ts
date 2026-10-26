import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { lockEnglishRecall } from '@/services/english/enTestService';

const schema = z.object({ attemptId: z.string().min(1) }).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Bài kiểm tra không hợp lệ', 400);
	return apiSuccess(await lockEnglishRecall(user.id, parsed.data.attemptId));
});
