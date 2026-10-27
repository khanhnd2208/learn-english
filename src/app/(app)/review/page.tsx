import { redirect } from 'next/navigation';
import ReviewOverview from '@/components/english/ReviewOverview';
import { auth } from '@/lib/auth';
import { getTodayOverview } from '@/services/english/enDailyService';
import { getGuidedReviewOverview } from '@/services/english/enGuidedReviewService';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [overview, guided] = await Promise.all([getTodayOverview(session.user.id), getGuidedReviewOverview(session.user.id)]);
	return <ReviewOverview overview={overview} guided={guided} />;
}
