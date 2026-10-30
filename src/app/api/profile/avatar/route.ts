import { z } from 'zod';
import { apiError, apiSuccess, withAuth } from '@/lib/apiUtils';
import { AVATAR_PROBLEM_COPY } from '@/lib/english/avatar';
import { avatarUrl } from '@/lib/english/leaderboard';
import { removeAvatar, saveAvatar } from '@/services/english/enAvatarService';

const uploadSchema = z.object({ file: z.instanceof(File) }).strict();

export const POST = withAuth(async (request, user) => {
	const form = await request.formData().catch(() => null);
	const parsed = uploadSchema.safeParse(form ? Object.fromEntries(form) : null);
	if (!parsed.success) return apiError(AVATAR_PROBLEM_COPY.empty, 400);
	return apiSuccess(await saveAvatar(user.id, parsed.data.file));
});

export const DELETE = withAuth(async (_request, user) => {
	await removeAvatar(user.id);
	return apiSuccess({ avatarUrl: avatarUrl(user.id, null, user.image) });
});
