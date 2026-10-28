import Link from 'next/link';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import type { GoalQuest } from '@/services/english/enGoalService';

export function questHref(quest: Pick<GoalQuest, 'action'>, quizHref: string): string {
	return quest.action === 'quiz' ? quizHref : quest.action === 'srs' ? '/#srs' : '/review';
}

/** One quest: icon, title, progress bar, reward and a link to where it gets done. */
export default function QuestItem({ quest, quizHref, compact = false, dense = false }: { quest: GoalQuest; quizHref: string; compact?: boolean; dense?: boolean }) {
	const percent = quest.target > 0 ? Math.round((quest.current / quest.target) * 100) : 0;
	if (dense) return <li className="flex min-w-0 items-center gap-2 border-b border-border py-2 last:border-b-0" data-done={quest.done}>
		<span className="shrink-0"><AdventureIcon name={quest.icon} size={18} framed /></span>
		<span className={`min-w-0 flex-1 line-clamp-2 text-sm font-bold ${quest.done ? 'text-foreground-secondary' : ''}`}>{quest.title}</span>
		<span className="shrink-0 text-xs font-bold tabular-nums text-muted">{quest.current}/{quest.target}</span>
		{quest.xp > 0 && <span className="shrink-0 text-xs font-bold text-accent">+{quest.xp}</span>}
		{!quest.done && <QuestLink quest={quest} quizHref={quizHref} />}
	</li>;
	return <li className={`quest-card flex items-center gap-3 ${compact ? 'p-3' : 'p-4'}`} data-done={quest.done}>
		<span className="relative shrink-0">
			<AdventureIcon name={quest.icon} size={compact ? 20 : 24} framed />
			{quest.done && <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-success text-xs font-black text-white">✓</span>}
		</span>
		<div className="min-w-0 flex-1">
			<div className="flex items-start justify-between gap-2">
				<p className={`font-bold ${quest.done ? 'text-foreground-secondary' : ''}`}>{quest.title}</p>
				{quest.xp > 0 && <span className="xp-chip">{quest.done ? '✓ ' : '+'}{quest.xp} XP</span>}
			</div>
			{!compact && !quest.done && <p className="mt-0.5 text-xs text-muted">{quest.hint}</p>}
			<div className="mt-2 flex items-center gap-2">
				<div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-subtle" role="progressbar" aria-label={quest.title} aria-valuemin={0} aria-valuemax={quest.target} aria-valuenow={quest.current}>
					<div className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${quest.done ? 'bg-success' : 'bg-accent'}`} style={{ width: `${percent}%` }} />
				</div>
				<span className="text-xs font-bold tabular-nums text-muted">{quest.current}/{quest.target}</span>
			</div>
		</div>
		{!quest.done && <QuestLink quest={quest} quizHref={quizHref} />}
	</li>;
}

function QuestLink({ quest, quizHref }: { quest: GoalQuest; quizHref: string }) {
	return <Link href={questHref(quest, quizHref)} aria-label={`Làm nhiệm vụ: ${quest.title}`} className="inline-flex min-h-11 shrink-0 items-center rounded-control px-2 text-sm font-bold text-accent hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Làm →</Link>;
}
