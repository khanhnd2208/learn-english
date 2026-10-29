import { requestNow } from '@/lib/requestNow';
import { redirect } from 'next/navigation';
import HomeDashboard from '@/components/english/HomeDashboard';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { getGoalBoard } from '@/services/english/enGoalService';
import { timeLeftLabel } from '@/lib/english/quests';
import { auth } from '@/lib/auth';
import { getTodayOverview } from '@/services/english/enDailyService';

export const dynamic = 'force-dynamic';

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function greetingFor(now: Date, name: string | null | undefined): string {
	const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: VN_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now));
	const part = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
	const first = name?.trim().split(/\s+/).pop();
	return first ? `${part}, ${first}` : part;
}

export default async function EnglishHomePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const now = requestNow();
	const [overview, sets, board] = await Promise.all([getTodayOverview(session.user.id), listEnglishSets(session.user.id, false), getGoalBoard(session.user.id)]);
	const dateLabel = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
	return <HomeDashboard overview={overview} sets={sets} board={board} resetsIn={timeLeftLabel(board.today.resetsAt, now)} greeting={greetingFor(now, session.user.name)} dateLabel={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} />;
}
