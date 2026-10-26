import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { startToday } from '@/services/english/enDailyService';

const schema = z.object({ extra: z.boolean().optional() }).strict();
export const POST = withAuth(async (request, user) => {
 const parsed = schema.safeParse(await request.json().catch(() => ({})));
 if (!parsed.success) return apiError('Yêu cầu không hợp lệ', 400);
 return apiSuccess(await startToday(user.id, parsed.data));
});
