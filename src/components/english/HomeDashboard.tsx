import Link from 'next/link';
import StageBar from '@/components/english/StageBar';
import QuestNote from '@/components/english/goals/QuestNote';
import ProgressStrip from '@/components/english/home/ProgressStrip';
import TodayHero from '@/components/english/home/TodayHero';
import type { EnglishSetSummary } from '@/services/english/enCatalogService';
import type { TodayOverview } from '@/services/english/enDailyService';
import type { GoalBoard } from '@/services/english/enGoalService';

const SETS_SHOWN = 3;

function SetRow({ set }: { set: EnglishSetSummary }) {
	return <li className="border-b border-border last:border-b-0">
		<Link href={`/sets/${set.id}`} className="group block px-4 py-3 hover:bg-accent-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
			<span className="flex items-center gap-3">
				<span className="min-w-0 flex-1 truncate font-bold" title={set.title}>{set.title}</span>
				{set.dueToday > 0 && <span className="shrink-0 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-bold text-accent">{set.dueToday} đến hạn</span>}
				<span className="shrink-0 text-xs tabular-nums text-muted">{set.learned}/{set.words}</span>
				<span aria-hidden="true" className="text-accent transition-transform group-hover:translate-x-1">→</span>
			</span>
			<span className="mt-2 block"><StageBar stages={set.stages} /></span>
		</Link>
	</li>;
}

/**
 * "Today" home: one action first, then how the learner is doing, then their sets.
 * Today's quests are always pinned beside it; on wide screens they and progress move to a side column.
 */
export default function HomeDashboard({ overview, sets, board, resetsIn, greeting, dateLabel }: { overview: TodayOverview; sets: EnglishSetSummary[]; board: GoalBoard; resetsIn: string; greeting: string; dateLabel: string }) {
	const enrolled = sets.filter((set) => set.enrolled).sort((a, b) => b.dueToday - a.dueToday);
	const stages = enrolled.reduce((sum, set) => ({ new: sum.new + set.stages.new, learning: sum.learning + set.stages.learning, remembering: sum.remembering + set.stages.remembering, longTerm: sum.longTerm + set.stages.longTerm }), { new: 0, learning: 0, remembering: 0, longTerm: 0 });
	const hasSets = enrolled.length > 0;

	return <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8">
		<header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 sm:mb-6 sm:block"><h1 className="truncate text-xl sm:text-3xl">{greeting}</h1><p className="text-xs text-muted sm:mt-0.5">{dateLabel}</p></header>

		<div className="grid grid-cols-1 gap-3.5 sm:gap-4 lg:grid-cols-3 lg:items-start lg:gap-5">
			<div className="min-w-0 lg:col-span-2 lg:row-start-1"><TodayHero overview={overview} xp={board.today.xp} goal={board.today.goal} /></div>

			{hasSets && <div className="min-w-0 lg:col-start-3 lg:row-start-2"><ProgressStrip streak={overview.streakDays} longTerm={board.longTermCount} level={board.level} stages={stages} /></div>}

			<div className="min-w-0 lg:col-start-3 lg:row-start-1"><QuestNote board={board} resetsIn={resetsIn} hasSets={hasSets} /></div>

			{hasSets && <section id="your-sets" aria-labelledby="your-sets-heading" className="min-w-0 overflow-hidden rounded-panel border border-border bg-surface lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-2">
				<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2"><h2 id="your-sets-heading" className="text-base sm:text-lg">Đang học <span className="text-sm font-normal text-muted">({enrolled.length})</span></h2><Link href="/sets" className="inline-flex min-h-10 shrink-0 items-center text-sm font-bold text-accent">Xem tất cả →</Link></div>
				<ul>{enrolled.slice(0, SETS_SHOWN).map((set) => <SetRow key={set.id} set={set} />)}</ul>

			</section>}

		</div>
	</div>;
}
