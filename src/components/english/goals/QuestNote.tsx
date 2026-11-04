import Link from 'next/link';
import QuestItem from '@/components/english/goals/QuestItem';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { todayQuestCount } from '@/lib/english/quests';
import type { GoalBoard } from '@/services/english/enGoalService';

/** Today's quests as a compact link on phones and a full list on wide screens. */
export default function QuestNote({ board }: { board: GoalBoard }) {
	const { xp, goal, quests } = board.today;
	const { done, total } = todayQuestCount(quests, xp, goal);
	const percent = goal > 0 ? Math.min(100, Math.round((xp / goal) * 100)) : 0;
	const week = board.week.quests[0];

	return <>
		<Link href="/progress" className="word-row flex-col items-stretch gap-2 lg:hidden">
			<span className="flex items-center justify-between gap-2"><span className="font-bold">Nhiệm vụ hôm nay</span><span className="shrink-0 font-bold tabular-nums">{done}/{total}</span></span>
			<span className="game-progress-track block h-2 overflow-hidden" role="progressbar" aria-label="XP hôm nay" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(xp, goal)}><span className="game-progress-fill block h-full" style={{ width: `${percent}%` }} /></span>
		</Link>
		<section aria-labelledby="quest-note-heading" className="quest-note hidden px-4 pt-4 pb-3.5 sm:pt-5 sm:pb-4 lg:block">
		<div className="flex items-baseline justify-between gap-2">
			<h2 id="quest-note-heading" className="text-base sm:text-lg">Nhiệm vụ hôm nay</h2>
			<span className={`rounded-full px-2 py-0.5 text-xs font-black tabular-nums sm:text-sm ${done === total ? 'bg-success text-white' : 'bg-surface text-foreground'}`}>{done}/{total}</span>
		</div>

		<div className="mt-2.5">
			<div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
				<span className={xp >= goal ? 'text-foreground-secondary line-through decoration-2' : ''}>{xp >= goal ? '✓ ' : ''}Mục tiêu {goal} XP</span>
				{xp > 0 && <span className="text-xs tabular-nums text-muted">{xp}/{goal}</span>}
			</div>
			<div className="game-progress-track h-2.5 overflow-hidden" role="progressbar" aria-label="XP hôm nay" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(xp, goal)}>
				<div className="game-progress-fill h-full transition-all duration-700 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
			</div>
		</div>

		<ul className="mt-2">{quests.map((quest) => <QuestItem key={quest.key} quest={quest} dense />)}</ul>

		{week ? (
				<Link href="/progress" className="mt-2.5 flex min-h-10 items-center justify-between gap-2 rounded-control bg-surface/80 px-3 py-2 text-xs font-bold hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
					<span className="flex min-w-0 items-center gap-1.5"><MaterialIcon name="calendar_month" size={16} className="shrink-0 text-muted" /><span>{week.title}</span></span>
					<span className="shrink-0 tabular-nums text-accent">{week.current}/{week.target} ngày →</span>
				</Link>
			) : (
				<Link href="/progress" className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-accent">Nhiệm vụ tuần và rương →</Link>
			)}
		</section>
	</>;
}
