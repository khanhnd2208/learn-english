import { z } from 'zod';
import { apiError, apiSuccess, withAdmin } from '@/lib/apiUtils';
import { audioCoverage, warmSet } from '@/services/english/enAudioService';

const body = z.object({ setId: z.string().min(1) }).strict();
export const GET = withAdmin(async (request) => {
	const parsed = body.safeParse({ setId: request.nextUrl.searchParams.get('setId') });
	return parsed.success ? apiSuccess(await audioCoverage(parsed.data.setId)) : apiError('Thiếu bộ học', 400);
});
export const POST = withAdmin(async (request) => {
	const parsed = body.safeParse(await request.json().catch(() => null));
	return parsed.success ? apiSuccess({ queued: await warmSet(parsed.data.setId) }) : apiError('Thiếu bộ học', 400);
});
