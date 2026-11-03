import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { addSetToSubject, deleteVocabSubject, moveSubjectSet, removeSetFromSubject, updateVocabSubject } from '@/services/english/enVocabSubjectService';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update'), title: z.string().trim().min(1).max(120).optional(), description: z.string().max(500).optional(), listed: z.boolean().optional(), accessCode: z.string().max(64).optional(), status: z.enum(['draft', 'published']).optional() }).strict(),
  z.object({ action: z.literal('addSet'), setId: z.string().min(1) }).strict(),
  z.object({ action: z.literal('removeSet'), setId: z.string().min(1) }).strict(),
  z.object({ action: z.literal('move'), setId: z.string().min(1), direction: z.enum(['up', 'down']) }).strict(),
]);
export const PATCH = withAdmin(async (request, _user, context) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Dữ liệu môn học không hợp lệ', 400);
  const { subjectId } = await context.params;
  switch (parsed.data.action) {
    case 'update': return apiSuccess(await updateVocabSubject(subjectId, { title: parsed.data.title, description: parsed.data.description, listed: parsed.data.listed, accessCode: parsed.data.accessCode, status: parsed.data.status }));
    case 'addSet': return apiSuccess(await addSetToSubject(subjectId, parsed.data.setId));
    case 'removeSet': return apiSuccess(await removeSetFromSubject(subjectId, parsed.data.setId));
    case 'move': return apiSuccess(await moveSubjectSet(subjectId, parsed.data.setId, parsed.data.direction));
  }
});
export const DELETE = withAdmin(async (_request, _user, context) => {
  const { subjectId } = await context.params;
  return apiSuccess(await deleteVocabSubject(subjectId));
});
