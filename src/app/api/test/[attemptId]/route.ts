import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getEnglishTest } from '@/services/english/enTestService';

type Ctx = { params: Promise<{ attemptId: string }> };

export const GET = withAuth(async (_request, user, ctx) => {
	const { attemptId } = await (ctx as Ctx).params;
	const result = await getEnglishTest(user.id, attemptId);
	return apiSuccess(result);
});
