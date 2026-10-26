import { redirect } from 'next/navigation';
import EnglishShell from '@/components/english/EnglishShell';
import { auth } from '@/lib/auth';
import { completedDailyTasks } from '@/lib/english/reviewSummary';
import { getTodayOverview } from '@/services/english/enDailyService';
import { getDailyTasks } from '@/services/english/enQuizService';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [overview, tasks] = await Promise.all([getTodayOverview(session.user.id), getDailyTasks(session.user.id)]);
	return <EnglishShell taskCount={completedDailyTasks(overview, tasks)}>{children}</EnglishShell>;
}
