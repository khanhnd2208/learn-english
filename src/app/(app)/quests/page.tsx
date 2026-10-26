import { redirect } from 'next/navigation';
import QuestsView from '@/components/english/goals/QuestsView';
import { auth } from '@/lib/auth';
import { timeLeftLabel } from '@/lib/english/quests';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { getGoalBoard } from '@/services/english/enGoalService';

export const dynamic = 'force-dynamic';

export default async function QuestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const now = new Date();
	const [board, sets, { tab }] = await Promise.all([getGoalBoard(session.user.id, now), listEnglishSets(session.user.id, false), searchParams]);
	const enrolled = sets.filter((set) => set.enrolled);
	return <QuestsView
		board={board}
		quizHref={enrolled.length === 1 ? `/sets/${enrolled[0]!.id}/test?type=mcq` : '/#your-sets'}
		dayResetsIn={timeLeftLabel(board.today.resetsAt, now)}
		weekResetsIn={timeLeftLabel(board.week.resetsAt, now)}
		initialTab={tab === 'week' || tab === 'achievements' ? tab : 'today'}
	/>;
}
