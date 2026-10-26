import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { getEnglishTestStartInfo, startEnglishTest } from '@/services/english/enTestService';

const bodySchema = z.object({
	mode: z.enum(['set', 'mistakes', 'review']),
	setId: z.string().min(1).optional(),
	restart: z.boolean().optional(),
}).strict();

const querySchema = z.object({
	mode: z.enum(['set', 'mistakes', 'review']),
	setId: z.string().min(1).optional(),
});

export const GET = withAuth(async (request, user) => {
	const parsed = querySchema.safeParse({ mode: request.nextUrl.searchParams.get('mode'), setId: request.nextUrl.searchParams.get('setId') ?? undefined });
	if (!parsed.success) return apiError('Bài kiểm tra không hợp lệ', 400);
	return apiSuccess(await getEnglishTestStartInfo(user.id, parsed.data));
});

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Bài kiểm tra không hợp lệ', 400);
	const test = await startEnglishTest(user.id, parsed.data);
	return apiSuccess(test);
});
