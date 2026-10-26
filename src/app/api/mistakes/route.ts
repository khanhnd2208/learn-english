import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { listMistakeBook } from '@/services/english/enPracticeService';

export const GET = withAuth(async (_request, user) => {
	const words = await listMistakeBook(user.id);
	return apiSuccess({ words });
});
