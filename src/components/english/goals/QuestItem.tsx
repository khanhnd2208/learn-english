import Link from 'next/link';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { isIdleQuest } from '@/lib/english/quests';
import type { GoalQuest } from '@/services/english/enGoalService';

export function questHref(quest: Pick<GoalQuest, 'action'>): string {
	return quest.action === 'srs' ? '/review?mode=luan-phien' : '/review?mode=bo';
}

/**
 * One quest: icon, title, progress bar, reward and a link to where it gets done.
 * `locked` greys it out with a padlock while the learner has no set to study.
 */
export default function QuestItem({ quest, compact = false, dense = false, locked = false }: { quest: GoalQuest; compact?: boolean; dense?: boolean; locked?: boolean }) {
	const percent = quest.target > 0 ? Math.round((quest.current / quest.target) * 100) : 0;
	const idle = locked || isIdleQuest(quest);
	const done = quest.done && !idle;
	if (dense) {
		const rowContent = <>
			<span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-xs font-black ${done ? 'border-success bg-success text-white' : idle ? 'border-border text-muted' : 'border-muted'}`}>{done ? '✓' : locked ? <MaterialIcon name="lock" size={13} /> : ''}</span>
			<span className={`min-w-0 flex-1 line-clamp-2 text-sm font-bold ${done ? 'text-foreground-secondary line-through decoration-2' : idle ? 'text-muted' : ''}`}>{quest.title}</span>
			{!idle && <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{quest.current}/{quest.target}</span>}
			{!idle && quest.xp > 0 && <span className="xp-chip shrink-0">+{quest.xp}</span>}
			{!idle && !quest.done && <span aria-hidden="true" className="shrink-0 text-sm font-bold text-accent">→</span>}
		</>;
		return <li className="border-b border-dashed border-[var(--note-border)] last:border-b-0" data-done={done}>
			{!idle && !quest.done ? (
				<Link href={questHref(quest)} aria-label={`Làm nhiệm vụ: ${quest.title}`} className="flex min-h-11 min-w-0 items-center gap-2 py-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
					{rowContent}
				</Link>
			) : (
				<div className="flex min-w-0 items-center gap-2 py-2">{rowContent}</div>
			)}
		</li>;
	}
	if (idle) return <li className="quest-card flex items-center gap-3 border-dashed p-3 opacity-75" data-done={false}>
		<span className="shrink-0 grayscale"><AdventureIcon name={quest.icon} size={20} framed /></span>
		<p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-bold text-muted">{locked && <MaterialIcon name="lock" size={16} />}{quest.title}</p>
	</li>;
	return <li className={`quest-card flex items-center gap-3 ${compact ? 'p-3' : 'p-3.5 sm:p-4'}`} data-done={quest.done}>
		<span className="relative shrink-0">
			<AdventureIcon name={quest.icon} size={compact ? 20 : 24} framed />
			{quest.done && <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-success text-xs font-black text-white">✓</span>}
		</span>
		<div className="min-w-0 flex-1">
			<div className="flex items-start justify-between gap-2">
				<p className={`text-sm font-bold sm:text-base ${quest.done ? 'text-foreground-secondary' : ''}`}>{quest.title}</p>
				{quest.xp > 0 && <span className="xp-chip shrink-0">{quest.done ? '✓ ' : '+'}{quest.xp} XP</span>}
			</div>
			{!compact && !quest.done && <p className="mt-0.5 text-xs text-muted">{quest.hint}</p>}
			<div className="mt-2 flex items-center gap-2">
				<div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-subtle" role="progressbar" aria-label={quest.title} aria-valuemin={0} aria-valuemax={quest.target} aria-valuenow={quest.current}>
					<div className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${quest.done ? 'bg-success' : 'bg-accent'}`} style={{ width: `${percent}%` }} />
				</div>
				<span className="text-xs font-bold tabular-nums text-muted">{quest.current}/{quest.target}</span>
				{!quest.done && <QuestLink quest={quest} />}
			</div>
		</div>
	</li>;
}

function QuestLink({ quest }: { quest: GoalQuest }) {
	return <Link href={questHref(quest)} aria-label={`Làm nhiệm vụ: ${quest.title}`} className="inline-flex min-h-8 shrink-0 items-center rounded-control px-1.5 text-xs font-bold text-accent hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-sm">Làm →</Link>;
}
