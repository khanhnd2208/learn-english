import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { englishAudioOpenSchema } from '@/lib/english/schemas';
import { recordEnglishAudioOpen } from '@/services/english/enAnswerService';

export const POST = withAuth(async (request, user) => {
	const parsed = englishAudioOpenSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thiếu mã câu hỏi', 400);
	await recordEnglishAudioOpen(user.id, parsed.data);
	return apiSuccess({ opened: true });
});
