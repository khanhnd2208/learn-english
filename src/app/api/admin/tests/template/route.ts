import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/apiUtils';
import { buildTestWorkbook } from '@/services/english/enTestWorkbookService';

export const GET = withAdmin(async () => new NextResponse(new Uint8Array(await buildTestWorkbook([])), {
  headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="mau-bai-kiem-tra.xlsx"' },
}));
