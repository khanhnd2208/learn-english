import { redirect } from 'next/navigation';
import HomeDashboard from '@/components/english/HomeDashboard';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { getDailyTasks } from '@/services/english/enQuizService';
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
	const now = new Date();
	const [overview, sets, tasks] = await Promise.all([getTodayOverview(session.user.id, now), listEnglishSets(session.user.id, session.user.role === 'admin'), getDailyTasks(session.user.id, now)]);
	const dateLabel = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
	return <HomeDashboard overview={overview} sets={sets} tasks={tasks} greeting={greetingFor(now, session.user.name)} dateLabel={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} />;
}
