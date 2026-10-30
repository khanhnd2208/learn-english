import { z } from 'zod';
import { apiError, apiSuccess, withAuth } from '@/lib/apiUtils';
import { LEADERBOARD_PERIODS } from '@/lib/english/leaderboard';
import { getLeaderboard } from '@/services/english/enLeaderboardService';

const querySchema = z.object({ period: z.enum(LEADERBOARD_PERIODS) }).strict();

export const GET = withAuth(async (request, user) => {
	const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
	if (!parsed.success) return apiError('Kỳ xếp hạng không hợp lệ', 400);
	return apiSuccess(await getLeaderboard(user.id, parsed.data.period));
});
