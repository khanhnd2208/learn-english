import { requestNow } from '@/lib/requestNow';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { timeLeftLabel } from '@/lib/english/quests';
import { getGoalBoard } from '@/services/english/enGoalService';
import { getTodayOverview } from '@/services/english/enDailyService';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { getProgressHistory } from '@/services/english/enProgressService';
import ProgressHub, { type ProgressTab } from '@/components/english/progress/ProgressHub';

export const dynamic = 'force-dynamic';

const TABS: ProgressTab[] = ['quests', 'stats', 'achievements'];

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const now = requestNow();
	const [board, overview, sets, history, { tab }] = await Promise.all([getGoalBoard(session.user.id), getTodayOverview(session.user.id), listEnglishSets(session.user.id, false), getProgressHistory(session.user.id, now), searchParams]);
	const stages = sets.filter((set) => set.enrolled).reduce((sum, set) => ({ new: sum.new + set.stages.new, learning: sum.learning + set.stages.learning, remembering: sum.remembering + set.stages.remembering, longTerm: sum.longTerm + set.stages.longTerm }), { new: 0, learning: 0, remembering: 0, longTerm: 0 });
	return <ProgressHub
		board={board}
		weeks={history.weeks}
		wrong={history.wrong}
		stages={stages}
		dueNext7Days={overview.dueNext7Days}
		dayResetsIn={timeLeftLabel(board.today.resetsAt, now)}
		weekResetsIn={timeLeftLabel(board.week.resetsAt, now)}
		initialTab={TABS.includes(tab as ProgressTab) ? tab as ProgressTab : 'quests'}
	/>;
}
