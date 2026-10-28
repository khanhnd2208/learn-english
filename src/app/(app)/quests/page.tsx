import { redirect } from 'next/navigation';
import QuestsView from '@/components/english/goals/QuestsView';
import { auth } from '@/lib/auth';
import { timeLeftLabel } from '@/lib/english/quests';
import { getGoalBoard } from '@/services/english/enGoalService';

export const dynamic = 'force-dynamic';

export default async function QuestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const now = new Date();
	const [board, { tab }] = await Promise.all([getGoalBoard(session.user.id, now), searchParams]);
	return <QuestsView
		board={board}
		dayResetsIn={timeLeftLabel(board.today.resetsAt, now)}
		weekResetsIn={timeLeftLabel(board.week.resetsAt, now)}
		initialTab={tab === 'week' || tab === 'achievements' ? tab : 'today'}
	/>;
}
