import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';
import { vnDayKey } from '@/lib/english/gapRule';
const schema = z.object({ dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), note: z.string().max(1000) }).strict();
export const GET = withAuth(async (request, user) => {
	const dayKey = request.nextUrl.searchParams.get('dayKey') ?? vnDayKey(new Date());
	return apiSuccess(await prisma.enDailyNote.findUnique({ where: { userId_dayKey: { userId: user.id, dayKey } } }));
});
export const PUT = withAuth(async (request, user) => {
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Ghi chú chưa hợp lệ', 400);
	const dayKey = parsed.data.dayKey ?? vnDayKey(new Date());
	return apiSuccess(await prisma.enDailyNote.upsert({ where: { userId_dayKey: { userId: user.id, dayKey } }, create: { userId: user.id, dayKey, note: parsed.data.note }, update: { note: parsed.data.note } }));
});
