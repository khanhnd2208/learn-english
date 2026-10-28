import Link from 'next/link';
import QuestItem from '@/components/english/goals/QuestItem';
import { todayQuestCount } from '@/lib/english/quests';
import type { GoalBoard } from '@/services/english/enGoalService';

/**
 * Today's quests as a pinned note on the home page. It always shows, even before the first set,
 * so the learner can see what a day asks of them; without sets the quests stay locked.
 */
export default function QuestNote({ board, resetsIn, hasSets }: { board: GoalBoard; resetsIn: string; hasSets: boolean }) {
	const { xp, goal, quests } = board.today;
	const { done, total } = todayQuestCount(quests, xp, goal);
	const percent = goal > 0 ? Math.min(100, Math.round((xp / goal) * 100)) : 0;
	const week = board.week.quests[0];

	return <section aria-labelledby="quest-note-heading" className="quest-note px-4 pt-5 pb-4">
		<div className="flex items-baseline justify-between gap-2">
			<h2 id="quest-note-heading" className="text-lg">📌 Nhiệm vụ hôm nay</h2>
			<span className={`rounded-full px-2 py-0.5 text-sm font-black tabular-nums ${done === total ? 'bg-success text-white' : 'bg-surface text-foreground'}`}>{done}/{total}</span>
		</div>
		<p className="text-xs text-muted">Làm mới sau {resetsIn}</p>

		<div className="mt-3">
			<div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
				<span className={xp >= goal ? 'text-foreground-secondary line-through decoration-2' : ''}>{xp >= goal ? '✓ ' : ''}Đạt {goal} XP hôm nay</span>
				<span className="text-xs tabular-nums text-muted">{xp}/{goal}</span>
			</div>
			<div className="game-progress-track h-2.5 overflow-hidden" role="progressbar" aria-label="XP hôm nay" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(xp, goal)}>
				<div className="game-progress-fill h-full transition-all duration-700 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
			</div>
		</div>

		<ul className="mt-2">{quests.map((quest) => <QuestItem key={quest.key} quest={quest} dense locked={!hasSets} />)}</ul>

		{week && <p className="mt-2 flex items-center justify-between gap-2 rounded-control bg-surface/70 px-3 py-2 text-xs font-bold">
			<span>🗓 {week.title}</span><span className="tabular-nums text-muted">{week.current}/{week.target} ngày</span>
		</p>}

		{hasSets
			? <Link href="/progress" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-accent">Nhiệm vụ tuần và rương →</Link>
			: <Link href="/store" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-accent px-4 font-bold text-accent-foreground">Chọn bộ từ để mở nhiệm vụ →</Link>}
	</section>;
}
