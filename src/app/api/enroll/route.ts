import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { enrollEnglishSet, unenrollEnglishSet } from '@/services/english/enCatalogService';

const bodySchema = z.object({ setId: z.string().min(1), accessCode: z.string().max(64).optional() }).strict();

export const POST = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thiếu bộ học', 400);
	await enrollEnglishSet(user.id, parsed.data.setId, parsed.data.accessCode);
	return apiSuccess({ enrolled: true });
});

export const DELETE = withAuth(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thiếu bộ học', 400);
	await unenrollEnglishSet(user.id, parsed.data.setId);
	return apiSuccess({ enrolled: false });
});
