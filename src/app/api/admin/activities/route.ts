import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { listEnglishActivities, updateEnglishActivity } from '@/services/english/enActivityService';

const patchSchema = z.object({
	key: z.string().min(1),
	inPractice: z.boolean().optional(),
	inTest: z.boolean().optional(),
	enabled: z.boolean().optional(),
}).strict();

export const GET = withAdmin(async () => {
	const activities = await listEnglishActivities();
	return apiSuccess({ activities });
});

export const PATCH = withAdmin(async (request) => {
	const parsed = patchSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Dạng bài không hợp lệ', 400);
	const activity = await updateEnglishActivity(parsed.data);
	return apiSuccess({ activity });
});
