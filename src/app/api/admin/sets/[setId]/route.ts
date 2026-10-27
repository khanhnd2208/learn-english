import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { deleteEnglishSet, updateEnglishSetStore } from '@/services/english/enContentService';

const patchSchema = z.object({
	listed: z.boolean().optional(),
	accessCode: z.string().max(64).optional(),
}).strict();

export const PATCH = withAdmin(async (request, _user, context) => {
	const parsed = patchSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Dữ liệu cửa hàng không hợp lệ', 400);
	const { setId } = await context.params;
	return apiSuccess(await updateEnglishSetStore(setId, parsed.data));
});

export const DELETE = withAdmin(async (_request, _user, context) => {
	const { setId } = await context.params;
	await deleteEnglishSet(setId);
	return apiSuccess({ deleted: true });
});
