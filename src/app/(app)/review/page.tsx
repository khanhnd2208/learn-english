import { redirect } from 'next/navigation';
import ReviewOverview from '@/components/english/ReviewOverview';
import { auth } from '@/lib/auth';
import { getTodayOverview } from '@/services/english/enDailyService';
import { listEnglishSets } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [overview, sets] = await Promise.all([getTodayOverview(session.user.id), listEnglishSets(session.user.id, false)]);
	return <ReviewOverview overview={overview} sets={sets.filter((set) => set.enrolled)} />;
}
