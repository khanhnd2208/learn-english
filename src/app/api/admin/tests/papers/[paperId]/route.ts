import { z } from 'zod';
import { NextResponse } from 'next/server';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { deleteTestPaper, exportTestPaper, setTestPaperStatus } from '@/services/english/enTestService';

const schema = z.object({ status: z.enum(['draft', 'published']) }).strict();
export const GET = withAdmin(async (_request, _user, context) => {
  const { paperId } = await context.params;
  const { fileName, data } = await exportTestPaper(paperId);
  return new NextResponse(new Uint8Array(data), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${fileName}"` } });
});
export const PATCH = withAdmin(async (request, _user, context) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Dữ liệu bài kiểm tra không hợp lệ', 400);
  const { paperId } = await context.params;
  return apiSuccess(await setTestPaperStatus(paperId, parsed.data.status));
});
export const DELETE = withAdmin(async (_request, _user, context) => {
  const { paperId } = await context.params;
  return apiSuccess(await deleteTestPaper(paperId));
});
