import { redirect } from 'next/navigation';
import ReviewOverview from '@/components/english/ReviewOverview';
import { auth } from '@/lib/auth';
import { getTodayOverview } from '@/services/english/enDailyService';
import { getGuidedReviewOverview } from '@/services/english/enGuidedReviewService';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ mode?: string; set?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [overview, guided, query] = await Promise.all([getTodayOverview(session.user.id), getGuidedReviewOverview(session.user.id), searchParams]);
	return <ReviewOverview key={query.set ?? "review"} overview={overview} guided={guided} mode={query.mode === 'luan-phien' ? 'luan-phien' : 'bo'} initialSetId={query.set} />;
}
