import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getAttemptXp } from '@/services/english/enTestService';

type Ctx = { params: Promise<{ attemptId: string }> };
export const GET = withAuth(async (_request, user, ctx) => {
	const { attemptId } = await (ctx as Ctx).params;
	return apiSuccess(await getAttemptXp(user.id, attemptId));
});
