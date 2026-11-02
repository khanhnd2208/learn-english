import { redirect } from 'next/navigation';
import ReviewOverview from '@/components/english/ReviewOverview';
import { auth } from '@/lib/auth';
import { getGuidedReviewOverview } from '@/services/english/enGuidedReviewService';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [guided, query] = await Promise.all([getGuidedReviewOverview(session.user.id), searchParams]);
	if (query.mode === 'luan-phien') redirect('/');
	return <ReviewOverview guided={guided} />;
}
