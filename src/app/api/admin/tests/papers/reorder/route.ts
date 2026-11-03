import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { reorderTestPapers } from '@/services/english/enTestService';

const schema = z.object({
  columns: z.array(z.object({ subjectId: z.string().min(1), paperIds: z.array(z.string().min(1)).max(200) }).strict()).min(1).max(50),
}).strict();
export const POST = withAdmin(async (request) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Dữ liệu thứ tự không hợp lệ', 400);
  return apiSuccess(await reorderTestPapers(parsed.data.columns));
});
