import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { computeGoalBoard } from '@/services/english/enGoalService';

export const GET = withAuth(async (_request, user) => apiSuccess(await computeGoalBoard(user.id, new Date())));
