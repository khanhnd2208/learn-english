import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { getEnglishBlueprint, updateEnglishBlueprint } from '@/services/english/enActivityService';

const patchSchema = z.object({
	recognizeKinds: z.array(z.string().min(1)).min(1),
	recallKinds: z.array(z.string().min(1)).min(1),
	maxWords: z.number().int().min(1).max(100),
	reviewWords: z.number().int().min(1).max(100),
	minGapDays: z.number().int().min(1).max(30),
}).strict();

export const GET = withAdmin(async () => {
	const blueprint = await getEnglishBlueprint();
	return apiSuccess({ blueprint });
});

export const PATCH = withAdmin(async (request) => {
	const parsed = patchSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Cấu trúc bài kiểm tra không hợp lệ', 400);
	const blueprint = await updateEnglishBlueprint(parsed.data);
	return apiSuccess({ blueprint });
});
