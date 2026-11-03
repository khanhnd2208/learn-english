import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { EN_TEST_MAX_FILE_BYTES } from '@/lib/english/constants';
import { previewTestImport, saveTestPaper } from '@/services/english/enTestService';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview'), file: z.instanceof(File) }).strict(),
  z.object({ action: z.literal('save'), file: z.instanceof(File), subjectId: z.string().min(1), title: z.string().trim().min(1).max(120), description: z.string().max(500).default(''), publish: z.enum(['true', 'false']), paperId: z.string().min(1).optional() }).strict(),
]);
export const POST = withAdmin(async (request) => {
  const form = await request.formData().catch(() => null);
  const parsed = schema.safeParse(form ? Object.fromEntries(form) : null);
  if (!parsed.success) return apiError('Dữ liệu bài kiểm tra không hợp lệ', 400);
  const { file } = parsed.data;
  if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > EN_TEST_MAX_FILE_BYTES) return apiError('File phải là .xlsx, tối đa 1 MB.', 400);
  const data = await file.arrayBuffer();
  if (parsed.data.action === 'preview') return apiSuccess(await previewTestImport(data));
  const { subjectId, title, description, publish, paperId } = parsed.data;
  return apiSuccess(await saveTestPaper({ subjectId, title, description, data, publish: publish === 'true', paperId }));
});
