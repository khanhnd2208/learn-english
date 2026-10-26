import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getEnglishSetDetail } from '@/services/english/enCatalogService';

type Ctx = { params: Promise<{ setId: string }> };

export const GET = withAuth(async (_request, user, ctx) => {
	const { setId } = await (ctx as Ctx).params;
	const detail = await getEnglishSetDetail(user.id, setId, user.role === 'admin');
	return apiSuccess(detail);
});
