import { apiSuccess, withAuth } from '@/lib/apiUtils';
import { prepareSpeechEngine, serverTtsAvailable } from '@/services/english/enTtsService';

export const GET = withAuth(async () => {
	// Pages with speaker buttons ask this first, so the voice starts loading before any tap.
	void prepareSpeechEngine();
	return apiSuccess({ serverTts: await serverTtsAvailable() });
});
