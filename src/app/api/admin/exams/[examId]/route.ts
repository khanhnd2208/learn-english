import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { deleteExam, getExamForAdmin, setExamStatus } from '@/services/english/enExamService';
const schema = z.object({ status: z.enum(['draft', 'published']) }).strict();
export const GET = withAdmin(async (_request, _user, context) => {
  const { examId } = await context.params;
  return apiSuccess(await getExamForAdmin(examId));
});
export const PATCH = withAdmin(async (request, _user, context) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Dữ liệu đề không hợp lệ', 400);
  const { examId } = await context.params;
  return apiSuccess(await setExamStatus(examId, parsed.data.status));
});
export const DELETE = withAdmin(async (_request, _user, context) => {
  const { examId } = await context.params;
  return apiSuccess(await deleteExam(examId));
});
