import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { getTodayProgress } from '@/services/english/enDailyService';

export const dynamic = 'force-dynamic';

const STAGES = [
	{ key: 'learning', label: 'Mới học', hint: 'ôn lại sau 1 ngày', color: 'bg-gold' },
	{ key: 'remembering', label: 'Đang nhớ', hint: 'ôn lại sau 3–7 ngày', color: 'bg-accent-bright' },
	{ key: 'long_term', label: 'Nhớ lâu', hint: 'ôn lại sau 21 ngày trở lên', color: 'bg-success' },
] as const;

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function dayLabel(day: string, offset: number): string {
	if (offset === 0) return 'Nay';
	if (offset === 1) return 'Mai';
	return WEEKDAY_SHORT[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? '';
}

function heatClass(count: number): string {
	if (count === 0) return 'bg-surface-container';
	if (count < 10) return 'bg-accent/30';
	if (count < 30) return 'bg-accent/60';
	return 'bg-accent';
}

export default async function EnglishProgressPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const progress = await getTodayProgress(session.user.id);
	const forecastMax = Math.max(1, ...progress.dueNext7Days.map((day) => day.count));
	const accuracy = progress.accuracy30 === null ? null : Math.round(progress.accuracy30 * 100);

	if (progress.learnedCount === 0) {
		return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
			<h1 className="text-3xl font-black">Tiến độ</h1>
			<div className="mt-6 rounded-dialog border border-border bg-surface p-8 text-center">
				<MaterialIcon name="insights" size={40} className="text-accent" />
				<p className="mt-3 text-lg font-black">Chưa có gì để thống kê</p>
				<p className="mt-1 text-sm text-muted">Học phiên đầu tiên. Từ ngày mai, bạn sẽ thấy các từ đi dần từ Mới học sang Nhớ lâu.</p>
				<Link href="/" className="mt-5 inline-flex h-11 items-center rounded-pill bg-accent px-5 text-xs font-bold uppercase tracking-widest text-accent-foreground hover:bg-accent-hover">Học hôm nay</Link>
			</div>
		</div>;
	}

	return <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
		<header className="animate-fade-slide-up"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Tiến độ</h1><p className="mt-1 text-sm text-muted">Chỉ số chính là số từ bạn vẫn nhớ sau ít nhất 7 ngày.</p></header>

		<dl className="animate-fade-slide-up-delay-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
			<div className="col-span-2 rounded-panel border border-accent/30 bg-accent-subtle p-5 lg:col-span-1"><dt className="label-caps">Nhớ lâu</dt><dd className="mt-1 text-5xl font-black tabular-nums text-accent">{progress.longTermCount}</dd><dd className="text-xs text-muted">trên {progress.learnedCount} từ đã học</dd></div>
			<div className="rounded-panel border border-border bg-surface p-5"><dt className="label-caps">Nhớ khi ôn</dt><dd className="mt-1 text-3xl font-black tabular-nums">{accuracy === null ? '–' : `${accuracy}%`}</dd><dd className="text-xs text-muted">30 ngày qua · nên ở mức 85–90%</dd></div>
			<div className="rounded-panel border border-border bg-surface p-5"><dt className="label-caps">Ngày học</dt><dd className="mt-1 text-3xl font-black tabular-nums">{progress.daysStudied30}</dd><dd className="text-xs text-muted">trong 30 ngày</dd></div>
			<div className="rounded-panel border border-border bg-surface p-5"><dt className="label-caps">Lượt trả lời</dt><dd className="mt-1 text-3xl font-black tabular-nums">{progress.reviews30}</dd><dd className="text-xs text-muted">trong 30 ngày</dd></div>
		</dl>

		<section className="animate-fade-slide-up-delay-2 rounded-panel border border-border bg-surface p-5">
			<h2 className="font-black">Các từ đang ở đâu</h2>
			<div className="mt-4 flex h-4 overflow-hidden rounded-full bg-surface-container" role="img" aria-label={STAGES.map((stage) => `${stage.label}: ${progress.stages[stage.key]}`).join(', ')}>
				{STAGES.map((stage) => progress.stages[stage.key] > 0 && <div key={stage.key} className={`${stage.color} h-full transition-all`} style={{ width: `${(progress.stages[stage.key] / progress.learnedCount) * 100}%` }} />)}
			</div>
			<ul className="mt-4 grid gap-3 sm:grid-cols-3">{STAGES.map((stage) => <li key={stage.key} className="flex items-start gap-3"><span className={`mt-1.5 size-3 shrink-0 rounded-sm ${stage.color}`} /><div><p className="font-bold">{stage.label} <span className="tabular-nums text-muted">· {progress.stages[stage.key]}</span></p><p className="text-xs text-muted">{stage.hint}</p></div></li>)}</ul>
		</section>

		<div className="grid gap-5 lg:grid-cols-2">
			<section className="rounded-panel border border-border bg-surface p-5">
				<h2 className="font-black">7 ngày tới</h2>
				<p className="text-xs text-muted">Số từ đến hạn mỗi ngày</p>
				<ol className="mt-4 flex h-40 items-end gap-2">{progress.dueNext7Days.map((day, offset) => <li key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
					<span className="text-xs font-bold tabular-nums text-foreground-secondary">{day.count}</span>
					<span className={`w-full max-w-10 rounded-t-md ${offset === 0 ? 'bg-accent' : 'bg-accent/35'}`} style={{ height: `${Math.max(4, (day.count / forecastMax) * 100)}%` }} />
					<span className={`text-[11px] font-bold ${offset === 0 ? 'text-accent' : 'text-muted'}`}>{dayLabel(day.day, offset)}</span>
				</li>)}</ol>
			</section>
			<section className="rounded-panel border border-border bg-surface p-5">
				<h2 className="font-black">30 ngày qua</h2>
				<p className="text-xs text-muted">Mỗi ô là một ngày, màu càng đậm thì học càng nhiều</p>
				<ol className="mt-4 grid grid-cols-10 gap-1.5">{progress.activity.map((day) => <li key={day.day} title={`${day.day}: ${day.count} lượt`} aria-label={`${day.day}: ${day.count} lượt`} className={`aspect-square rounded-[4px] ${heatClass(day.count)}`} />)}</ol>
			</section>
		</div>

		<section className="rounded-panel border border-border bg-surface p-5">
			<h2 className="font-black">Từ hay quên</h2>
			{progress.difficult.length ? <>
				<p className="text-xs text-muted">App đã tự đưa các từ này quay lại sớm hơn. Đọc lại câu ví dụ của chúng trong Bộ từ sẽ giúp nhớ thêm.</p>
				<ul className="mt-3 divide-y divide-border/60">{progress.difficult.map((item) => <li key={item.senseId} className="flex items-baseline justify-between gap-3 py-2.5"><span><span className="font-bold">{item.lemma}</span>{item.ipa && <span className="ml-2 font-mono text-xs text-muted">{item.ipa}</span>}<span className="block text-sm text-muted">{item.meaningVi}</span></span><span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-xs font-bold text-error">quên {item.lapses} lần</span></li>)}</ul>
			</> : <p className="mt-1 text-sm text-muted">Chưa có từ nào bị quên nhiều lần.</p>}
		</section>
	</div>;
}
