import { z } from 'zod';
import { apiError, apiSuccess, withAdmin } from '@/lib/apiUtils';
import { EN_APPEAL_STATUSES } from '@/lib/english/appeal';
import { listAppeals, resolveAppeal } from '@/services/english/enAppealService';

const statusSchema = z.enum(EN_APPEAL_STATUSES);
const bodySchema = z.object({ id: z.string().min(1), decision: z.enum(['accepted', 'rejected']) }).strict();

export const GET = withAdmin(async (request) => {
	const parsed = statusSchema.safeParse(request.nextUrl.searchParams.get('status') ?? 'pending');
	if (!parsed.success) return apiError('Trạng thái không hợp lệ', 400);
	return apiSuccess(await listAppeals(parsed.data));
});

export const POST = withAdmin(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Yêu cầu không hợp lệ', 400);
	return apiSuccess(await resolveAppeal(user.id, parsed.data));
});
