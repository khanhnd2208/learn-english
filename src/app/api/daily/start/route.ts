import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { startToday } from '@/services/english/enDailyService';

export const POST = withAuth(async (_request, user) => apiSuccess(await startToday(user.id)));
