import { redirect } from 'next/navigation';
import EnglishShell from '@/components/english/EnglishShell';
import type { ShellGoals } from '@/components/english/goals/RewardCenter';
import { auth } from '@/lib/auth';
import { getTodayOverview } from '@/services/english/enDailyService';
import { getGoalBoard } from '@/services/english/enGoalService';
import { getAvatarState } from '@/services/english/enAvatarService';
import { todayQuestCount } from '@/lib/english/quests';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [overview, board, avatar] = await Promise.all([getTodayOverview(session.user.id), getGoalBoard(session.user.id), getAvatarState(session.user.id, session.user.image)]);
	const questCount = todayQuestCount(board.today.quests, board.today.xp, board.today.goal);
	const goals: ShellGoals = {
		xp: board.today.xp,
		goal: board.today.goal,
		level: board.level.level,
		levelTitle: board.level.title,
		seenLevel: board.seenLevel,
		questsDone: questCount.done,
		questsTotal: questCount.total,
		dailyGoalXp: board.dailyGoalXp,
		// Ask for a goal once the learner has something to study, not on an empty first visit.
		showGoalPicker: !board.goalChosen && (overview.enrolledSets > 0 || overview.learnedCount > 0),
		unseen: board.unseenAchievements,
	};
	return <EnglishShell goals={goals} newLearner={overview.enrolledSets === 0 && overview.learnedCount === 0} avatarUrl={avatar.avatarUrl} hasUpload={avatar.hasUpload}>{children}</EnglishShell>;
}
