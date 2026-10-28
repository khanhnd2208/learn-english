import { apiSuccess, withAuth } from '@/lib/apiUtils';
import { serverTtsAvailable } from '@/services/english/enTtsService';

export const GET = withAuth(async () => apiSuccess({ serverTts: await serverTtsAvailable() }));
