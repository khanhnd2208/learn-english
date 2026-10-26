import Link from 'next/link';
import DueForecast from '@/components/english/DueForecast';
import StageBar from '@/components/english/StageBar';
import { QUIZ_KINDS, QUIZ_META } from '@/lib/english/quiz';
import { EN_LEITNER_INTERVALS } from '@/lib/english/constants';
import { DAILY_TASK_TOTAL, completedDailyTasks, isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import type { EnglishSetSummary } from '@/services/english/enCatalogService';
import type { TodayOverview } from '@/services/english/enDailyService';
import type { DailyTasks } from '@/services/english/enQuizService';

export default function HomeDashboard({ overview, sets, tasks, greeting, dateLabel }: {
	overview: TodayOverview;
	sets: EnglishSetSummary[];
	tasks: DailyTasks;
	greeting: string;
	dateLabel: string;
}) {
	const enrolled = sets.filter((set) => set.enrolled);
	const reviewDone = isReviewDone(overview);
	const completed = completedDailyTasks(overview, tasks);
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
			<div className="flex items-center gap-4">
				<span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent-subtle text-2xl font-black text-accent">{initial}</span>
				<div><h1 className="text-4xl sm:text-5xl">{greeting}</h1><p className="mt-1 text-sm text-muted">{overview.streakDays > 0 ? `🔥 ${overview.streakDays} ngày liên tiếp · ` : ''}Tuần này {studiedThisWeek}/{overview.weeklyGoal} ngày</p></div>
			</div>
			<p className="text-sm text-muted">{dateLabel}</p>
		</header>

		<section aria-label="Tiến độ của bạn" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{[['Bộ đang học', enrolled.length], ['Tổng từ', totalWords], ['Đã học', learned], ['Đến hạn hôm nay', overview.dueTotal]].map(([label, count]) => <div key={label} className="mode-card p-4"><p className="text-xs font-bold text-muted">{label}</p><p className="game-number mt-2 text-3xl tabular-nums sm:text-4xl">{count}</p></div>)}
		</section>

		{enrolled.length === 0 ? <section className="mode-card p-7"><h2 className="text-3xl">Bạn chưa có bộ từ nào</h2><p className="mt-2 text-muted">Tải một bộ từ để bắt đầu học và theo dõi từng bước ôn tập.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-control bg-accent px-5 font-bold text-accent-foreground" href="/store">Mở Cửa hàng →</Link></section> : <>
			<Link href="/review" className="mode-card flex flex-wrap items-center justify-between gap-4 border-2 border-accent bg-accent-subtle p-6 hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-accent">
				<div><h2 className="text-2xl">{reviewDone ? '✓ Xong hôm nay' : 'Ôn hôm nay'}</h2><p className="mt-1 text-sm">{reviewDone ? 'Bạn đã hoàn thành lượt ôn hôm nay.' : `${overview.dueTotal} từ đến hạn + ${overview.newCount} từ mới · ~${reviewMinutes(overview)} phút`}</p></div>
				<span className="rounded-control bg-accent px-5 py-3 font-bold text-accent-foreground">{reviewDone ? 'Luyện thêm →' : 'Vào ôn →'}</span>
			</Link>

			<section className="mode-card"><h2 className="text-2xl">Lộ trình SRS</h2><p className="mt-1 text-sm text-muted">Mỗi lần ôn đúng, từ tiến lên một bước trong lịch ôn.</p><div className="mt-5"><StageBar stages={stages} legend /></div><p className="mt-4 text-xs text-muted">Chu kỳ ôn: {EN_LEITNER_INTERVALS.slice(1).join(' → ')} ngày.</p></section>

			<section id="your-sets" className="scroll-mt-6 space-y-4"><div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-3xl">Bộ từ của bạn ({enrolled.length})</h2><Link href="/store" className="font-bold text-accent">Mở Cửa hàng →</Link></div>
				<ul className="grid gap-4 md:grid-cols-2">{enrolled.map((set) => <li key={set.id} className="mode-card flex flex-col gap-4">
					<div><h3 className="text-xl font-black">{set.title}</h3><p className="mt-1 text-sm text-muted">{set.learned}/{set.words} từ đã học · {set.dueToday} từ đến hạn</p></div>
					<StageBar stages={set.stages} legend />
					<div className="mt-auto flex flex-wrap gap-2 pt-2"><Link href={`/sets/${set.id}/practice`} className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground">Luyện tập</Link><Link href={`/sets/${set.id}/test`} className="inline-flex min-h-11 items-center rounded-control border border-border px-4 text-sm font-bold">Kiểm tra</Link><Link href={`/sets/${set.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-accent">Chi tiết →</Link></div>
				</li>)}<li><Link href="/store" className="flex h-full min-h-48 items-center justify-center rounded-panel border-2 border-dashed border-border bg-surface p-6 text-center text-lg font-bold text-accent hover:border-accent">+ Tải thêm bộ từ ở Cửa hàng</Link></li></ul>
			</section>

			<div className="grid gap-4 lg:grid-cols-2"><section className="mode-card"><div className="flex items-center justify-between gap-2"><h2 className="text-2xl">Kiểm tra hôm nay</h2><span className={`font-bold tabular-nums ${completed === DAILY_TASK_TOTAL ? 'text-success' : ''}`}>{completed}/{DAILY_TASK_TOTAL}</span></div><ul className="mt-4 space-y-2">{QUIZ_KINDS.map((kind) => { const task = tasks[kind]; return <li key={kind} className="task-row"><span aria-hidden="true" className={task ? 'text-success' : 'text-muted'}>{task ? '✓' : '○'}</span><div className="min-w-0 flex-1"><p className="font-bold">Kiểm tra {QUIZ_META[kind].label}</p><p className="text-sm text-muted">{task ? `${task.passedCount}/${task.wordCount} · ${task.setTitle}` : 'Chưa làm'}</p></div>{!task && <Link href={enrolled.length === 1 ? `/sets/${enrolled[0]!.id}/test?type=${kind}` : '#your-sets'} className="inline-flex min-h-11 items-center font-bold text-accent">{enrolled.length === 1 ? 'Làm ngay →' : 'Chọn bộ ↓'}</Link>}</li>; })}</ul></section>
				<section className="mode-card"><h2 className="text-2xl">Lịch ôn 7 ngày tới</h2><div className="mt-5"><DueForecast days={overview.dueNext7Days} height="h-32" /></div></section></div>
		</>}
	</div>;
}
