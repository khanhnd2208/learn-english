import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { createVocabSubject } from '@/services/english/enVocabSubjectService';

const schema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().max(500).default('') }).strict();
export const POST = withAdmin(async (request) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Dữ liệu môn học không hợp lệ', 400);
  return apiSuccess(await createVocabSubject(parsed.data), 201);
});
