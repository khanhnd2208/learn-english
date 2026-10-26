import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getGoalBoard } from '@/services/english/enGoalService';

export const GET = withAuth(async (_request, user) => apiSuccess(await getGoalBoard(user.id)));
