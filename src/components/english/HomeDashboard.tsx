import Link from 'next/link';
import DueForecast from '@/components/english/DueForecast';
import StageBar from '@/components/english/StageBar';
import GoalRing from '@/components/english/goals/GoalRing';
import LevelBar from '@/components/english/goals/LevelBar';
import QuestItem from '@/components/english/goals/QuestItem';
import RemoveSetButton from '@/components/english/RemoveSetButton';
import { EN_LEITNER_INTERVALS } from '@/lib/english/constants';
import { isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import { estimateReviewXp } from '@/lib/english/xp';
import type { EnglishSetSummary } from '@/services/english/enCatalogService';
import type { TodayOverview } from '@/services/english/enDailyService';
import type { GoalBoard } from '@/services/english/enGoalService';

export default function HomeDashboard({ overview, sets, board, resetsIn, greeting, dateLabel }: {
	overview: TodayOverview;
	sets: EnglishSetSummary[];
	board: GoalBoard;
	/** Time until the daily quests reset, e.g. "5 giờ". */
	resetsIn: string;
	greeting: string;
	dateLabel: string;
}) {
	const enrolled = sets.filter((set) => set.enrolled);
	const reviewDone = isReviewDone(overview);
	const quizHref = enrolled.length === 1 ? `/sets/${enrolled[0]!.id}/test?type=mcq` : '#your-sets';
	const questsDone = board.today.quests.filter((quest) => quest.done).length;
	const studiedThisWeek = overview.week.filter((day) => day.studied).length;
	const initial = greeting.split(/[\s,]+/).at(-1)?.charAt(0).toLocaleUpperCase('vi') || 'B';
	const totalWords = enrolled.reduce((sum, set) => sum + set.words, 0);
	const learned = enrolled.reduce((sum, set) => sum + set.learned, 0);
	const stages = enrolled.reduce((sum, set) => ({
		new: sum.new + set.stages.new,
		learning: sum.learning + set.stages.learning,
		remembering: sum.remembering + set.stages.remembering,
		longTerm: sum.longTerm + set.stages.longTerm,
	}), { new: 0, learning: 0, remembering: 0, longTerm: 0 });

	return <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-10">
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div className="flex min-w-0 items-center gap-4">
				<span aria-hidden="true" className="relative flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent-subtle text-2xl font-black text-accent">{initial}<span className="level-badge absolute -right-2 -bottom-1 text-[10px]">{board.level.level}</span></span>
				<div className="min-w-0"><h1 className="text-4xl sm:text-5xl">{greeting}</h1><p className="mt-1 text-sm text-muted">{overview.streakDays > 0 ? `🔥 ${overview.streakDays} ngày liên tiếp · ` : ''}Tuần này {studiedThisWeek}/{overview.weeklyGoal} ngày</p></div>
			</div>
			<div className="w-full sm:w-64"><p className="mb-1 text-right text-xs text-muted">{dateLabel}</p><Link href="/quests" className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><LevelBar level={board.level} /></Link></div>
		</header>

		<section aria-label="Tiến độ của bạn" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{[['Bộ đang học', enrolled.length], ['Tổng từ', totalWords], ['Đã học', learned], ['Đến hạn hôm nay', overview.dueTotal]].map(([label, count]) => <div key={label} className="mode-card p-4"><p className="text-xs font-bold text-muted">{label}</p><p className="game-number mt-2 text-3xl tabular-nums sm:text-4xl">{count}</p></div>)}
		</section>

		{enrolled.length === 0 ? <section className="mode-card p-7"><h2 className="text-3xl">Bạn chưa có bộ từ nào</h2><p className="mt-2 text-muted">Tải một bộ từ để bắt đầu học và theo dõi từng bước ôn tập.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-control bg-accent px-5 font-bold text-accent-foreground" href="/store">Mở Cửa hàng →</Link></section> : <>
			<Link href="/review" className="mode-card flex flex-wrap items-center justify-between gap-4 border-2 border-accent bg-accent-subtle p-6 hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-accent">
				<div><h2 className="text-2xl">{reviewDone ? '✓ Xong hôm nay' : 'Ôn hôm nay'}</h2><p className="mt-1 text-sm">{reviewDone ? 'Bạn đã hoàn thành lượt ôn hôm nay.' : `${overview.dueTotal} từ đến hạn + ${overview.newCount} từ mới · ~${reviewMinutes(overview)} phút`}</p>{!reviewDone && <p className="mt-2"><span className="xp-chip">≈ +{estimateReviewXp(overview.dueCount, overview.newCount)} XP</span></p>}</div>
				<span className="rounded-control bg-accent px-5 py-3 font-bold text-accent-foreground">{reviewDone ? 'Luyện thêm →' : 'Vào ôn →'}</span>
			</Link>

			<section className="mode-card"><h2 className="text-2xl">Lộ trình SRS</h2><p className="mt-1 text-sm text-muted">Mỗi lần ôn đúng, từ tiến lên một bước trong lịch ôn.</p><div className="mt-5"><StageBar stages={stages} legend /></div><p className="mt-4 text-xs text-muted">Chu kỳ ôn: {EN_LEITNER_INTERVALS.slice(1).join(' → ')} ngày.</p></section>

			<section id="your-sets" aria-labelledby="your-sets-heading" className="flex h-80 scroll-mt-6 flex-col overflow-hidden rounded-panel border border-border bg-surface">
				<div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"><h2 id="your-sets-heading" className="text-2xl sm:text-3xl">Bộ từ của bạn ({enrolled.length})</h2><Link href="/store" className="shrink-0 text-sm font-bold text-accent">Thêm bộ từ →</Link></div>
				<ul className="min-h-0 flex-1 overflow-y-auto">{enrolled.map((set) => <li key={set.id} className="flex items-center border-b border-border last:border-b-0 hover:bg-accent-subtle focus-within:bg-accent-subtle">
					<Link href={`/sets/${set.id}`} aria-label={`Mở bộ từ ${set.title}`} className="group min-w-0 flex-1 px-4 py-3 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent sm:pl-5 sm:pr-3">
						<div className="flex items-center gap-3"><div className="min-w-0 flex-1"><h3 className="truncate font-bold" title={set.title}>{set.title}</h3><p className="text-xs text-muted">{set.learned}/{set.words} từ đã học{set.dueToday > 0 ? ` · ${set.dueToday} đến hạn` : ''}</p></div><span aria-hidden="true" className="text-lg text-accent transition-transform group-hover:translate-x-1">→</span></div>
						<div className="mt-2"><StageBar stages={set.stages} /></div>
					</Link>
					<div className="shrink-0 pr-4 sm:pr-5"><RemoveSetButton setId={set.id} setTitle={set.title} stayOnPage compact /></div>
				</li>)}</ul>
			</section>

			<div className="grid gap-4 lg:grid-cols-2"><section aria-labelledby="today-quests-heading" className="mode-card">
				<div className="flex items-center gap-4">
					<GoalRing value={board.today.xp} max={board.today.goal} size={64} label="Mục tiêu ngày"><span className="game-number text-lg tabular-nums">{board.today.xp}</span><span className="text-[9px] text-muted">/{board.today.goal} XP</span></GoalRing>
					<div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 id="today-quests-heading" className="text-2xl">Nhiệm vụ hôm nay</h2><span className={`font-bold tabular-nums ${questsDone === board.today.quests.length ? 'text-success' : ''}`}>{questsDone}/{board.today.quests.length}</span></div><p className="text-xs text-muted">Làm mới sau {resetsIn}</p></div>
				</div>
				<ul className="mt-4 space-y-2">{board.today.quests.map((quest) => <QuestItem key={quest.key} quest={quest} quizHref={quizHref} compact />)}</ul>
				<Link href="/quests" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-accent">Nhiệm vụ tuần & thành tựu →</Link>
			</section>
				<section className="mode-card"><h2 className="text-2xl">Lịch ôn 7 ngày tới</h2><div className="mt-5"><DueForecast days={overview.dueNext7Days} height="h-32" /></div></section></div>
		</>}
	</div>;
}
