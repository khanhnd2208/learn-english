import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { enrollVocabSubject, leaveVocabSubject } from '@/services/english/enVocabSubjectService';

const postSchema = z.object({ accessCode: z.string().max(64).optional() }).strict();
const deleteSchema = z.object({}).strict();

export const POST = withAuth(async (request, user, context) => {
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Yêu cầu không hợp lệ', 400);
  const { subjectId } = await context.params;
  return apiSuccess(await enrollVocabSubject(user.id, subjectId, parsed.data.accessCode));
});
export const DELETE = withAuth(async (request, user, context) => {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Yêu cầu không hợp lệ', 400);
  const { subjectId } = await context.params;
  return apiSuccess(await leaveVocabSubject(user.id, subjectId));
});
