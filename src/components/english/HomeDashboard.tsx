import Link from 'next/link';
import DueForecast from '@/components/english/DueForecast';
import { QUIZ_KINDS, QUIZ_META } from '@/lib/english/quiz';
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

	return <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-10">
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div className="flex items-center gap-4">
				<span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent-subtle text-2xl font-black text-accent">{initial}</span>
				<div>
					<h1 className="text-4xl sm:text-5xl">{greeting}</h1>
					<p className="mt-1 text-sm text-muted">
						{overview.streakDays > 0 ? `🔥 ${overview.streakDays} ngày liên tiếp · ` : ''}Tuần này {studiedThisWeek}/{overview.weeklyGoal} ngày
					</p>
				</div>
			</div>
			<p className="text-sm text-muted">{dateLabel}</p>
		</header>

		{enrolled.length === 0 ? <section className="mode-card">
			<h2 className="text-3xl">Chọn bộ từ đầu tiên</h2>
			<p className="mt-2 text-muted">Đăng ký một bộ từ. Tổng hợp sẽ đưa 10 từ mới mỗi ngày vào lịch ôn, còn bạn tự chọn khi nào luyện tập hay kiểm tra.</p>
			<Link className="mt-5 inline-flex min-h-11 items-center rounded-control bg-accent px-5 font-bold text-accent-foreground" href="/sets">Khám phá bộ từ →</Link>
		</section> : <>
			<section className="mode-card sm:p-7">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-2xl">Nhiệm vụ hôm nay</h2>
					<p className={`font-bold tabular-nums ${completed === DAILY_TASK_TOTAL ? 'text-success' : ''}`}>{completed}/{DAILY_TASK_TOTAL} xong</p>
				</div>
				{completed === DAILY_TASK_TOTAL && <p className="mt-4 rounded-control bg-success-subtle p-3 font-bold text-success">✓ Hoàn thành hôm nay! Muốn học thêm, vào Tổng hợp để luyện các từ yếu nhất.</p>}
				<Link href="/review" className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-panel border-2 border-accent bg-accent-subtle p-5 hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-accent">
					<div>
						<p className="text-xl font-black">{reviewDone ? '✓' : '★'} Tổng hợp</p>
						<p className="text-sm">{reviewDone
							? 'Đã ôn hết từ đến hạn và từ mới hôm nay'
							: `Ôn ${overview.dueTotal} từ đến hạn + ${overview.newCount} từ mới · khoảng ${reviewMinutes(overview)} phút`}</p>
					</div>
					<span className="font-bold text-accent">{reviewDone ? 'Luyện thêm →' : 'Vào ôn →'}</span>
				</Link>
				<ul className="mt-3 space-y-2">
					{QUIZ_KINDS.map((kind) => {
						const task = tasks[kind];
						return <li key={kind} className="task-row">
							<span aria-hidden="true" className={`text-lg ${task ? 'text-success' : 'text-muted'}`}>{task ? '✓' : '○'}</span>
							<div className="min-w-0 flex-1">
								<p className="font-bold">Kiểm tra {QUIZ_META[kind].label}</p>
								<p className="text-sm text-muted">{task ? `${task.passedCount}/${task.wordCount} · ${task.setTitle}` : `Chưa làm · ${QUIZ_META[kind].hint.toLowerCase()}`}</p>
							</div>
							{!task && <Link href={enrolled.length === 1 ? `/sets/${enrolled[0]!.id}/test?type=${kind}` : '/sets'} className="inline-flex min-h-11 items-center font-bold text-accent">{enrolled.length === 1 ? 'Làm ngay →' : 'Chọn bộ →'}</Link>}
						</li>;
					})}
				</ul>
			</section>

			<div className="grid gap-4 md:grid-cols-2">
				<section className="mode-card">
					<h2 className="text-2xl">Của bạn</h2>
					<dl className="mt-4 grid grid-cols-3 gap-2 text-center">
						<div><dd className="game-number text-3xl">{overview.learnedCount}</dd><dt className="text-xs text-muted">từ đã học</dt></div>
						<div><dd className="game-number text-3xl text-success">{overview.longTermCount}</dd><dt className="text-xs text-muted">nhớ lâu</dt></div>
						<div><dd className="game-number text-3xl">{overview.accuracy30 === null ? '—' : `${Math.round(overview.accuracy30 * 100)}%`}</dd><dt className="text-xs text-muted">nhớ khi ôn · 30 ngày</dt></div>
					</dl>
					<p className="mt-5 text-sm text-muted">Lịch ôn 7 ngày tới</p>
					<div className="mt-2"><DueForecast days={overview.dueNext7Days} height="h-24" /></div>
				</section>
				<section className="mode-card">
					<h2 className="text-2xl">Bộ đang học</h2>
					<ul className="mt-3 space-y-3">
						{enrolled.map((set) => <li key={set.id}>
							<Link href={`/sets/${set.id}`} className="block rounded-control border border-border p-3 hover:border-accent focus-visible:ring-2 focus-visible:ring-accent">
								<div className="flex justify-between gap-3"><span className="font-bold">{set.title}</span><span className="text-sm tabular-nums text-muted">{set.learned}/{set.words}</span></div>
								<div className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-container">
									<div className="absolute inset-y-0 left-0 rounded-full bg-accent/40" style={{ width: `${set.words ? (set.learned / set.words) * 100 : 0}%` }} />
									<div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${set.words ? (set.longTerm / set.words) * 100 : 0}%` }} />
								</div>
							</Link>
						</li>)}
					</ul>
					<Link href="/sets" className="mt-2 inline-flex min-h-11 items-center font-bold text-accent">+ Thêm bộ từ</Link>
				</section>
			</div>
		</>}
	</div>;
}
