'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import GuidedReviewSession, { type GuidedSession } from '@/components/english/GuidedReviewSession';
import StudySession from '@/components/english/StudySession';
import { englishPost } from '@/components/english/englishApi';
import { isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import type { TodayOverview } from '@/services/english/enDailyService';

export type GuidedReviewOverview = {
	sets: Array<{ id: string; title: string; words: number }>;
	selectedSetIds: string[];
	uniqueWords: number;
	practicedToday: number;
	activeSessionId: string | null;
};

export default function ReviewOverview({ overview, guided: initial }: { overview: TodayOverview; guided: GuidedReviewOverview }) {
	const router = useRouter();
	const [guided, setGuided] = useState(initial);
	const [session, setSession] = useState<GuidedSession | null>(null);
	const [srsOpen, setSrsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const filtered = useMemo(() => guided.sets.filter((set) => set.title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [guided.sets, search]);
	const selected = new Set(guided.selectedSetIds);
	const allSetIds = guided.sets.map((set) => set.id);
	const allSelected = allSetIds.length > 0 && allSetIds.every((id) => selected.has(id));
	const srsDone = isReviewDone(overview);
	const srsTotal = overview.dueCount + overview.newCount;

	async function saveSelection(setIds: string[]) {
		setBusy(true);
		setError('');
		try {
			setGuided(await englishPost<GuidedReviewOverview>('/api/review', { action: 'selection', setIds }));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không lưu được lựa chọn.');
		} finally {
			setBusy(false);
		}
	}

	async function start() {
		setBusy(true);
		setError('');
		try {
			const started = await englishPost<GuidedSession>('/api/review', { action: 'start', setIds: guided.selectedSetIds });
			setGuided((current) => ({ ...current, activeSessionId: started.id }));
			setSession(started);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không bắt đầu được phiên ôn.');
		} finally {
			setBusy(false);
		}
	}

	return <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-5xl flex-col px-4 py-3 sm:h-auto sm:px-6 sm:py-8">
		<header className="mb-2 shrink-0 sm:mb-5"><h1 className="text-3xl sm:text-4xl">Hôm nay học gì?</h1></header>

		<div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-3 sm:grid-cols-2 sm:grid-rows-1 sm:gap-5">
			<section aria-labelledby="guided-review-heading" className="mode-card relative flex min-h-0 flex-col overflow-hidden border-2 border-accent p-3 sm:p-6">
				<div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-accent-subtle opacity-70" />
				<div className="relative flex items-start gap-3">
					<span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-card border-2 border-accent bg-accent-subtle text-2xl shadow-sm">📖</span>
					<div><h2 id="guided-review-heading" className="text-2xl">Ôn tập</h2><p className="mt-0.5 text-sm text-muted">Luyện tự do, không ảnh hưởng lịch SRS</p></div>
				</div>

				{guided.sets.length > 0 ? <div className="relative mt-3 flex min-h-0 flex-1 flex-col sm:mt-4">
					{guided.sets.length > 8 && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bộ từ…" aria-label="Tìm bộ từ" className="mb-2 min-h-10 w-full rounded-control border border-border bg-background px-3 text-sm" />}
					<div className="max-h-24 overflow-y-auto pr-1 sm:max-h-32" aria-label="Chọn bộ từ để ôn">
						<div className="flex flex-wrap gap-2">
							<button type="button" aria-pressed={allSelected} disabled={busy} onClick={() => void saveSelection(allSelected ? [] : allSetIds)} className={`min-h-9 rounded-full border px-3 text-sm font-bold disabled:opacity-40 ${allSelected ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface hover:border-accent'}`}>{allSelected ? '✓ ' : ''}Tất cả</button>
							{filtered.map((set) => {
								const active = selected.has(set.id);
								return <button key={set.id} type="button" aria-pressed={active} disabled={busy} onClick={() => void saveSelection(active ? guided.selectedSetIds.filter((id) => id !== set.id) : [...guided.selectedSetIds, set.id])} title={`${set.title} · ${set.words} từ`} className={`min-h-9 max-w-full truncate rounded-full border px-3 text-sm font-bold disabled:opacity-40 ${active ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface hover:border-accent'}`}>{active ? '✓ ' : ''}{set.title}</button>;
							})}
						</div>
					</div>
					{filtered.length === 0 && <p className="mt-2 text-sm text-muted">Không tìm thấy bộ từ phù hợp.</p>}
					<div className="mt-2 flex items-center justify-between gap-3 text-sm"><p className="font-bold text-foreground-secondary"><span className="tabular-nums">{guided.selectedSetIds.length}</span> bộ · <span className="tabular-nums">{guided.uniqueWords}</span> từ</p><Link href="/store" className="shrink-0 font-bold text-accent hover:underline">Thêm bộ từ →</Link></div>
				</div> : <div className="relative mt-5 flex flex-1 items-center rounded-card border border-dashed border-border bg-surface-secondary p-4"><Link href="/store" className="font-bold text-accent hover:underline">Tải bộ từ ở Cửa hàng →</Link></div>}

				<div className="relative mt-3 sm:mt-4">
					<button type="button" disabled={busy || guided.uniqueWords === 0} onClick={() => void start()} className="min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">Bắt đầu ôn <span aria-hidden="true">→</span></button>
					{error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
				</div>
			</section>

			<section aria-labelledby="srs-review-heading" className="mode-card relative flex min-h-0 flex-col overflow-hidden border-2 border-accent p-3 sm:p-6">
				<div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-accent-subtle opacity-70" />
				<div className="relative flex items-start gap-3">
					<span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-card border-2 border-accent bg-accent-subtle text-2xl shadow-sm">🧠</span>
					<div><h2 id="srs-review-heading" className="text-2xl">Kiểm tra SRS</h2><p className="mt-0.5 text-sm text-muted">Ôn đúng lúc để nhớ lâu hơn</p></div>
				</div>

				<div className="relative my-3 flex min-h-0 flex-1 items-center sm:my-7">
					{srsDone ? <p className="text-lg font-bold text-success">✓ Xong hôm nay · mai có <span className="tabular-nums">{overview.tomorrowCount}</span> từ</p> : <div>
						<p className="text-xl font-bold"><span className="tabular-nums">{overview.dueCount}</span> đến hạn · <span className="tabular-nums">{overview.newCount}</span> mới</p>
						<p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-sm font-bold text-accent"><span aria-hidden="true">⏱</span>~{reviewMinutes(overview)} phút</p>
					</div>}
				</div>

				{!srsDone && <button type="button" disabled={srsTotal === 0} onClick={() => setSrsOpen(true)} className="relative mt-auto min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">Bắt đầu kiểm tra <span aria-hidden="true">→</span></button>}
			</section>
		</div>

		{srsOpen && <StudySession onClose={(studied) => { setSrsOpen(false); if (studied) router.refresh(); }} />}
		{session && <GuidedReviewSession initial={session} onClose={(finished) => { setSession(null); if (finished) router.refresh(); }} />}
	</div>;
}
