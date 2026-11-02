import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { answerExam, finishExam, startExam } from '@/services/english/enExamService';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }).strict(),
  z.object({ action: z.literal('answer'), attemptId: z.string().min(1), position: z.number().int().min(0), answer: z.string().max(200) }).strict(),
  z.object({ action: z.literal('finish'), attemptId: z.string().min(1) }).strict(),
]);
export const POST = withAuth(async (request, user, context) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Yêu cầu không hợp lệ', 400);
  const { examId } = await context.params;
  if (parsed.data.action === 'start') return apiSuccess(await startExam(user.id, examId, user.role === 'admin'));
  if (parsed.data.action === 'answer') return apiSuccess(await answerExam(user.id, parsed.data.attemptId, parsed.data.position, parsed.data.answer));
  return apiSuccess(await finishExam(user.id, parsed.data.attemptId));
});
