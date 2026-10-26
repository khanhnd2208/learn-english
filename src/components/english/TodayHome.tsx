'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import StudySession from '@/components/english/StudySession';
import type { TodayOverview } from '@/services/english/enDailyService';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SECONDS_PER_REVIEW = 10;
const SECONDS_PER_NEW = 35;

function minutesFor(due: number, fresh: number): number {
	return Math.max(1, Math.round((due * SECONDS_PER_REVIEW + fresh * SECONDS_PER_NEW) / 60));
}

export default function TodayHome({ overview, greeting, dateLabel }: { overview: TodayOverview; greeting: string; dateLabel: string }) {
	const router = useRouter();
	const [studying, setStudying] = useState(false);
	const total = overview.dueCount + overview.newCount;
	const daysThisWeek = overview.week.filter((day) => day.studied).length;
	const noContent = overview.enrolledSets === 0 && overview.learnedCount === 0;
	const extraDue = overview.dueTotal - overview.dueCount;

	return <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
		<header className="animate-fade-slide-up">
			<p className="text-sm font-bold text-muted">{dateLabel}</p>
			<h1 className="mt-1 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{greeting}</h1>
		</header>

		<section className="animate-fade-slide-up-delay-1 overflow-hidden rounded-dialog border border-border bg-surface shadow-elevated">
			{noContent ? <div className="space-y-4 p-6 sm:p-8">
				<span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent"><MaterialIcon name="library_add" size={26} /></span>
				<div><h2 className="text-2xl font-black">Chọn bộ từ đầu tiên</h2><p className="mt-1 text-foreground-secondary">Đăng ký một bộ từ. Mỗi ngày bạn sẽ học vài từ mới, và app tự nhắc ôn đúng lúc bạn sắp quên.</p></div>
				<Link href="/sets" className="inline-flex h-12 items-center gap-2 rounded-pill bg-accent px-6 text-sm font-bold uppercase tracking-widest text-accent-foreground hover:bg-accent-hover">Xem bộ từ <MaterialIcon name="arrow_forward" size={18} /></Link>
			</div> : total > 0 ? <div className="p-6 sm:p-8">
				<p className="label-caps">Bài học hôm nay</p>
				<div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
					<div><p className="text-5xl font-black tabular-nums text-foreground">{overview.dueCount}</p><p className="text-sm font-bold text-muted">từ cần ôn</p></div>
					<div><p className="text-5xl font-black tabular-nums text-accent">{overview.newCount}</p><p className="text-sm font-bold text-muted">từ mới</p></div>
					<div className="ml-auto hidden text-right sm:block"><p className="text-2xl font-black tabular-nums">~{minutesFor(overview.dueCount, overview.newCount)}<span className="text-base"> phút</span></p><p className="text-sm text-muted">ước tính</p></div>
				</div>
				<Button size="lg" fullWidth className="mt-6 h-14 text-base" onClick={() => setStudying(true)} rightIcon={<MaterialIcon name="arrow_forward" size={20} />}>Bắt đầu học</Button>
				<p className="mt-3 text-center text-xs text-muted sm:hidden">Khoảng {minutesFor(overview.dueCount, overview.newCount)} phút</p>
				{(extraDue > 0 || (overview.newCount === 0 && overview.dueTotal > 50)) && <p className="mt-3 flex items-start gap-2 text-sm text-foreground-secondary"><MaterialIcon name="info" size={18} className="mt-0.5 text-muted" />{overview.dueTotal > 50 ? `Đang có ${overview.dueTotal} từ đến hạn. App tạm dừng từ mới để bạn bắt kịp phần ôn.` : `Còn ${extraDue} từ cho vòng sau.`}</p>}
			</div> : <div className="flex items-start gap-4 p-6 sm:p-8">
				<span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-subtle text-success"><MaterialIcon name="task_alt" filled size={28} /></span>
				<div className="space-y-1">
					<h2 className="text-2xl font-black">Xong hôm nay</h2>
					<p className="text-foreground-secondary">{overview.tomorrowCount > 0 ? `Ngày mai có ${overview.tomorrowCount} từ đến hạn.` : 'Ngày mai chưa có từ nào đến hạn.'} {overview.introducedToday > 0 ? `Hôm nay bạn đã học ${overview.introducedToday} từ mới.` : ''}</p>
					{overview.enrolledSets === 0 ? <Link href="/sets" className="inline-block pt-2 text-sm font-bold text-accent">Đăng ký thêm bộ từ để có từ mới →</Link> : <Link href="/sets" className="inline-block pt-2 text-sm font-bold text-accent">Còn sức? Luyện tự do một bộ từ →</Link>}
				</div>
			</div>}
		</section>

		{!noContent && <div className="animate-fade-slide-up-delay-2 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
			<section className="rounded-panel border border-border bg-surface p-5">
				<div className="flex items-baseline justify-between"><h2 className="font-black">Tuần này</h2><p className="text-sm font-bold tabular-nums text-muted">{daysThisWeek}/{overview.weeklyGoal} ngày</p></div>
				<ol className="mt-4 grid grid-cols-7 gap-1.5">{overview.week.map((day, index) => <li key={day.day} className="flex flex-col items-center gap-1.5">
					<span className={`week-day-tile flex aspect-square w-full max-w-11 items-center justify-center ${day.studied ? 'is-done' : day.isFuture ? 'is-future' : day.isToday ? 'is-pending' : ''}`} aria-label={`${WEEKDAY_LABELS[index]}: ${day.studied ? 'đã học' : 'chưa học'}`}>{day.studied && <MaterialIcon name="check" size={18} />}</span>
					<span className={`text-[11px] font-bold ${day.isToday ? 'text-accent' : 'text-muted'}`}>{WEEKDAY_LABELS[index]}</span>
				</li>)}</ol>
				<p className="mt-3 text-xs text-muted">{daysThisWeek >= overview.weeklyGoal ? 'Đã đạt mục tiêu tuần. Nghỉ một ngày cũng không mất gì.' : `Học thêm ${overview.weeklyGoal - daysThisWeek} ngày nữa để đạt mục tiêu tuần.`}</p>
			</section>
			<Link href="/progress" className="group rounded-panel border border-border bg-surface p-5 transition hover:border-accent">
				<div className="flex items-baseline justify-between"><h2 className="font-black">Nhớ lâu</h2><MaterialIcon name="arrow_forward" size={18} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" /></div>
				<p className="mt-3 text-5xl font-black tabular-nums text-accent">{overview.longTermCount}</p>
				<p className="mt-1 text-sm text-muted">trên {overview.learnedCount} từ đã học. Một từ vào nhóm này khi bạn vẫn nhớ nó sau ít nhất 7 ngày.</p>
			</Link>
		</div>}

		{overview.recentLapses.length > 0 && <section className="animate-fade-slide-up-delay-3 rounded-panel border border-border bg-surface p-5">
			<h2 className="font-black">Từ vừa quên</h2>
			<p className="mt-1 text-sm text-muted">Bình thường thôi. Chúng sẽ quay lại sớm hơn để bạn củng cố.</p>
			<ul className="mt-3 flex flex-wrap gap-2">{overview.recentLapses.map((word) => <li key={word.senseId} className="rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-sm"><span className="font-bold">{word.lemma}</span><span className="text-muted"> · {word.meaningVi}</span></li>)}</ul>
		</section>}

		{studying && <StudySession onClose={(studied) => { setStudying(false); if (studied) router.refresh(); }} />}
	</div>;
}
