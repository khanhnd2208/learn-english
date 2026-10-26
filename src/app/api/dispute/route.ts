import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { englishDisputeSchema } from '@/lib/english/schemas';
import { fileEnglishDispute } from '@/services/english/enAnswerService';

export const POST = withAuth(async (request, user) => {
	const parsed = englishDisputeSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Báo cáo không hợp lệ', 400);
	const result = await fileEnglishDispute(user.id, parsed.data);
	return apiSuccess(result);
});
