import Link from 'next/link';
import DueForecast from '@/components/english/DueForecast';
import StageBar from '@/components/english/StageBar';
import QuestItem from '@/components/english/goals/QuestItem';
import ProgressStrip from '@/components/english/home/ProgressStrip';
import TodayHero from '@/components/english/home/TodayHero';
import { quizHrefFor } from '@/lib/english/quests';
import type { EnglishSetSummary } from '@/services/english/enCatalogService';
import type { TodayOverview } from '@/services/english/enDailyService';
import type { GoalBoard } from '@/services/english/enGoalService';

const SETS_SHOWN = 5;

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
 * On wide screens progress, quests and the 7-day forecast move to a side column.
 */
export default function HomeDashboard({ overview, sets, board, resetsIn, greeting, dateLabel }: { overview: TodayOverview; sets: EnglishSetSummary[]; board: GoalBoard; resetsIn: string; greeting: string; dateLabel: string }) {
	const enrolled = sets.filter((set) => set.enrolled).sort((a, b) => b.dueToday - a.dueToday);
	const quizHref = quizHrefFor(sets);
	const questsDone = board.today.quests.filter((quest) => quest.done).length;
	const stages = enrolled.reduce((sum, set) => ({ new: sum.new + set.stages.new, learning: sum.learning + set.stages.learning, remembering: sum.remembering + set.stages.remembering, longTerm: sum.longTerm + set.stages.longTerm }), { new: 0, learning: 0, remembering: 0, longTerm: 0 });
	const hasSets = enrolled.length > 0;

	return <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
		<header className="mb-4 sm:mb-6"><h1 className="truncate text-2xl sm:text-3xl">{greeting}</h1><p className="mt-0.5 text-xs text-muted">{dateLabel}</p></header>

		<div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-5">
			<div className="min-w-0 lg:col-span-2 lg:row-start-1"><TodayHero overview={overview} xp={board.today.xp} goal={board.today.goal} /></div>

			{hasSets && <div className="min-w-0 lg:col-start-3 lg:row-start-1"><ProgressStrip streak={overview.streakDays} longTerm={board.longTermCount} level={board.level} xp={board.today.xp} goal={board.today.goal} stages={stages} /></div>}

			{hasSets && <section aria-labelledby="today-quests-heading" className="mode-card min-w-0 lg:col-start-3 lg:row-start-2">
				<div className="flex items-baseline justify-between gap-2"><h2 id="today-quests-heading" className="text-lg">Nhiệm vụ hôm nay</h2><span className={`text-sm font-bold tabular-nums ${questsDone === board.today.quests.length ? 'text-success' : 'text-muted'}`}>{questsDone}/{board.today.quests.length}</span></div>
				<ul className="mt-2">{board.today.quests.map((quest) => <QuestItem key={quest.key} quest={quest} quizHref={quizHref} dense />)}</ul>
				<p className="mt-2 flex items-center justify-between gap-2 text-xs text-muted"><span>Làm mới sau {resetsIn}</span><Link href="/quests" className="inline-flex min-h-11 items-center text-sm font-bold text-accent">Tất cả →</Link></p>
			</section>}

			{hasSets && <section id="your-sets" aria-labelledby="your-sets-heading" className="min-w-0 overflow-hidden rounded-panel border border-border bg-surface lg:col-span-2 lg:row-span-2 lg:row-start-2">
				<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2"><h2 id="your-sets-heading" className="text-lg">Đang học <span className="text-sm font-normal text-muted">({enrolled.length})</span></h2><Link href="/store" className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent">+ Thêm bộ</Link></div>
				<ul>{enrolled.slice(0, SETS_SHOWN).map((set) => <SetRow key={set.id} set={set} />)}</ul>
				{enrolled.length > SETS_SHOWN && <details className="border-t border-border">
					<summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-bold text-accent">Xem thêm {enrolled.length - SETS_SHOWN} bộ</summary>
					<ul className="border-t border-border">{enrolled.slice(SETS_SHOWN).map((set) => <SetRow key={set.id} set={set} />)}</ul>
				</details>}
			</section>}

			{hasSets && <section aria-labelledby="forecast-heading" className="mode-card min-w-0 lg:col-start-3 lg:row-start-3">
				<h2 id="forecast-heading" className="text-lg">7 ngày tới</h2>
				<div className="mt-3"><DueForecast days={overview.dueNext7Days} height="h-20" /></div>
			</section>}
		</div>
	</div>;
}
