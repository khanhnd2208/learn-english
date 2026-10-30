import { z } from 'zod';
import { apiError, apiSuccess, withAuth } from '@/lib/apiUtils';
import { getEnrolledSetWords } from '@/services/english/enCatalogService';

type Ctx = { params: Promise<{ setId: string }> };
export const GET = withAuth(async (_request, user, ctx) => {
	const parsed = z.object({ setId: z.string().min(1) }).strict().safeParse(await (ctx as Ctx).params);
	if (!parsed.success) return apiError('Yêu cầu xem bộ từ không hợp lệ', 400);
	return apiSuccess(await getEnrolledSetWords(user.id, parsed.data.setId));
});
