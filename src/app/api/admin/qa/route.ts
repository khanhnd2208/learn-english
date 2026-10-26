import { z } from 'zod';
import { apiError, apiSuccess, withAdmin } from '@/lib/apiUtils';
import { englishQaToolsEnabled, resetEnglishQaProgress, shiftEnglishQaDataOneDay } from '@/services/english/enQaService';

const bodySchema = z.object({ action: z.enum(['shift_one_day', 'reset']), setId: z.string().min(1) }).strict();

export const POST = withAdmin(async (request, user) => {
	if (!englishQaToolsEnabled()) return apiError('Công cụ test đang tắt', 403);
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Yêu cầu không hợp lệ', 400);
	const result = parsed.data.action === 'shift_one_day'
		? await shiftEnglishQaDataOneDay(user.id, parsed.data.setId)
		: await resetEnglishQaProgress(user.id, parsed.data.setId);
	return apiSuccess(result);
});
