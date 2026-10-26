import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { getEnglishTest, lockEnglishRecall } from '@/services/english/enTestService';
import { z } from 'zod';

type Ctx = { params: Promise<{ attemptId: string }> };

export const GET = withAuth(async (_request, user, ctx) => {
	const { attemptId } = await (ctx as Ctx).params;
	const result = await getEnglishTest(user.id, attemptId);
	return apiSuccess(result);
});

export const POST = withAuth(async (request, user, ctx) => {
	const { attemptId } = await (ctx as Ctx).params;
	const parsed = z.object({ action: z.literal('lock-recall') }).strict().safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Yêu cầu không hợp lệ', 400);
	return apiSuccess(await lockEnglishRecall(user.id, attemptId));
});
