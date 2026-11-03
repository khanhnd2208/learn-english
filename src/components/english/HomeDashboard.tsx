import QuestNote from '@/components/english/goals/QuestNote';
import GuidedReviewCard from '@/components/english/home/GuidedReviewCard';
import ProgressStrip from '@/components/english/home/ProgressStrip';
import TodayHero from '@/components/english/home/TodayHero';
import { liveStages } from '@/lib/english/progressStats';
import type { TodayOverview } from '@/services/english/enDailyService';
import type { GoalBoard } from '@/services/english/enGoalService';


/**
 * "Today" home: one action first, then how the learner is doing, then their sets.
 * Today's quests are always pinned beside it; on wide screens they and progress move to a side column.
 */
export default function HomeDashboard({ overview, board, resetsIn, greeting, dateLabel }: { overview: TodayOverview; board: GoalBoard; resetsIn: string; greeting: string; dateLabel: string }) {
	const stages = liveStages(overview);
	const hasSets = overview.enrolledSets > 0;

	return <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8">
		<header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 sm:mb-6 sm:block"><h1 className="truncate text-xl sm:text-3xl">{greeting}</h1><p className="text-xs text-muted sm:mt-0.5">{dateLabel}</p></header>

		{/* Two independent columns on wide screens so a tall quest note never leaves a gap under the hero.
		    Below lg the column wrappers dissolve (`contents`) and `order` keeps hero → progress → quests → sets. */}
		<div className="grid grid-cols-1 gap-3.5 sm:gap-4 lg:grid-cols-3 lg:items-start lg:gap-5">
			<div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-5">
				<div className="order-1 grid min-w-0 gap-3.5 sm:gap-4 sm:grid-cols-2">
					<TodayHero overview={overview} xp={board.today.xp} goal={board.today.goal} />
					<GuidedReviewCard hasSets={hasSets} />
				</div>
			</div>

			<div className="contents lg:flex lg:flex-col lg:gap-5">
				<div className="order-3 min-w-0 lg:order-none"><QuestNote board={board} resetsIn={resetsIn} hasSets={hasSets} /></div>
				{hasSets && <div className="order-2 min-w-0 lg:order-none"><ProgressStrip streak={overview.streakDays} longTerm={board.longTermCount} level={board.level} stages={stages} /></div>}
			</div>
		</div>
	</div>;
}
