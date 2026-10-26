import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getEnglishProgress } from '@/services/english/enProgressService';

export const GET = withAuth(async (_request, user) => {
	const progress = await getEnglishProgress(user.id);
	return apiSuccess(progress);
});
