import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { deleteTestSubject, updateTestSubject } from '@/services/english/enTestSubjectService';

const schema = z.object({ action: z.literal('update'), title: z.string().trim().min(1).max(120).optional(), description: z.string().max(500).optional(), listed: z.boolean().optional(), accessCode: z.string().max(64).optional(), status: z.enum(['draft', 'published']).optional() }).strict();
export const PATCH = withAdmin(async (request, _user, context) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Dữ liệu môn học không hợp lệ', 400);
  const { subjectId } = await context.params;
  return apiSuccess(await updateTestSubject(subjectId, { title: parsed.data.title, description: parsed.data.description, listed: parsed.data.listed, accessCode: parsed.data.accessCode, status: parsed.data.status }));
});
export const DELETE = withAdmin(async (_request, _user, context) => {
  const { subjectId } = await context.params;
  return apiSuccess(await deleteTestSubject(subjectId));
});
