import { requestNow } from '@/lib/requestNow';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { timeLeftLabel } from '@/lib/english/quests';
import { getGoalBoard } from '@/services/english/enGoalService';
import { getTodayOverview } from '@/services/english/enDailyService';
import { liveStages } from '@/lib/english/progressStats';
import { getProgressHistory } from '@/services/english/enProgressService';
import ProgressHub, { type ProgressTab } from '@/components/english/progress/ProgressHub';

export const dynamic = 'force-dynamic';

const TABS: ProgressTab[] = ['leaderboard', 'quests', 'stats'];

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const now = requestNow();
	const [board, overview, history, { tab }] = await Promise.all([getGoalBoard(session.user.id), getTodayOverview(session.user.id), getProgressHistory(session.user.id, now), searchParams]);
	const stages = liveStages(overview);
	return <ProgressHub
		board={board}
		weeks={history.weeks}
		wrong={history.wrong}
		stages={stages}
		dueNext7Days={overview.dueNext7Days}
		dayResetsIn={timeLeftLabel(board.today.resetsAt, now)}
		weekResetsIn={timeLeftLabel(board.week.resetsAt, now)}
		initialTab={TABS.includes(tab as ProgressTab) ? tab as ProgressTab : 'leaderboard'}
	/>;
}
