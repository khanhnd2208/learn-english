import { z } from 'zod';
import { apiError, apiSuccess, withAuth } from '@/lib/apiUtils';
import { safeSettle } from '@/services/english/enGoalService';
import {
	answerGuidedReview,
	abandonGuidedReview,
	finishGuidedReview,
	getGuidedReviewOverview,
	nextGuidedChunk,
	openGuidedReviewSession,
	saveGuidedReviewSelection,
	saveStudyPosition,
	startGuidedRetry,
	startGuidedReview,
} from '@/services/english/enGuidedReviewService';

const bodySchema = z.discriminatedUnion('action', [
	z.object({ action: z.literal('selection'), setIds: z.array(z.string().min(1)).max(100) }).strict(),
	z.object({ action: z.literal('start'), setIds: z.array(z.string().min(1)).max(100) }).strict(),
	z.object({ action: z.literal('open'), sessionId: z.string().min(1) }).strict(),
	z.object({ action: z.literal('study'), sessionId: z.string().min(1), position: z.number().int().nonnegative() }).strict(),
	z.object({ action: z.literal('answer'), sessionId: z.string().min(1), questionId: z.string().min(1), answer: z.string().max(500), responseMs: z.number().finite().nonnegative() }).strict(),
	z.object({ action: z.literal('retry'), sessionId: z.string().min(1) }).strict(),
	z.object({ action: z.literal('next'), sessionId: z.string().min(1), restart: z.boolean().optional() }).strict(),
	z.object({ action: z.literal('finish'), sessionId: z.string().min(1) }).strict(),
	z.object({ action: z.literal('abandon'), sessionId: z.string().min(1) }).strict(),
]);

export const GET = withAuth(async (_request, user) => apiSuccess(await getGuidedReviewOverview(user.id)));

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Yêu cầu ôn tập không hợp lệ', 400);
	const input = parsed.data;
	if (input.action === 'selection') return apiSuccess(await saveGuidedReviewSelection(user.id, input.setIds));
	if (input.action === 'start') return apiSuccess(await startGuidedReview(user.id, input.setIds));
	if (input.action === 'open') return apiSuccess(await openGuidedReviewSession(user.id, input.sessionId));
	if (input.action === 'study') return apiSuccess(await saveStudyPosition(user.id, input.sessionId, input.position));
	if (input.action === 'retry') return apiSuccess(await startGuidedRetry(user.id, input.sessionId));
	if (input.action === 'next') return apiSuccess(await nextGuidedChunk(user.id, input.sessionId, input.restart === true));
	if (input.action === 'finish') return apiSuccess(await finishGuidedReview(user.id, input.sessionId));
	if (input.action === 'abandon') return apiSuccess(await abandonGuidedReview(user.id, input.sessionId));
	const result = await answerGuidedReview(user.id, input.sessionId, input.questionId, input.answer, input.responseMs);
	return apiSuccess({ ...result, reward: await safeSettle(user.id, result.xp) });
});
