import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { previewExam, saveExam } from '@/services/english/enExamService';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview'), text: z.string().max(200_000) }).strict(),
  z.object({ action: z.literal('save'), courseId: z.string().min(1), setId: z.string().min(1).nullable(), title: z.string().trim().min(1).max(120), description: z.string().max(500).default(''), text: z.string().max(200_000), publish: z.boolean(), examId: z.string().min(1).optional() }).strict(),
]);
export const POST = withAdmin(async (request) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Dữ liệu đề không hợp lệ', 400);
  if (parsed.data.action === 'preview') return apiSuccess(previewExam(parsed.data.text));
  return apiSuccess(await saveExam({ courseId: parsed.data.courseId, setId: parsed.data.setId, title: parsed.data.title, description: parsed.data.description, text: parsed.data.text, publish: parsed.data.publish, examId: parsed.data.examId }));
});
