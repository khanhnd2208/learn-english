import { redirect } from 'next/navigation';
import EnglishShell from '@/components/english/EnglishShell';
import { auth } from '@/lib/auth';
import { getTodayOverview } from '@/services/english/enDailyService';
import { getDailyTasks } from '@/services/english/enQuizService';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [overview, tasks] = await Promise.all([getTodayOverview(session.user.id), getDailyTasks(session.user.id)]);
	const taskCount = Number(overview.dueTotal === 0 && overview.newCount === 0) + Object.keys(tasks).length;
	return <EnglishShell taskCount={taskCount}>{children}</EnglishShell>;
}
