'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SrsTodayCard from '@/components/english/SrsTodayCard';
import GuidedReviewSession, { type GuidedSession } from '@/components/english/GuidedReviewSession';
import { englishPost } from '@/components/english/englishApi';
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
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const filtered = useMemo(() => guided.sets.filter((set) => set.title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [guided.sets, search]);
	const selected = new Set(guided.selectedSetIds);

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

	return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
		<header><h1 className="text-4xl sm:text-5xl">Ôn tập</h1><p className="mt-2 text-muted">Luyện tập tự do — không ảnh hưởng lịch SRS.</p></header>

		<section className="mode-card border-2 border-accent sm:p-7">
			<div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl">Chọn bộ từ để ôn</h2><p className="mt-1 text-sm text-muted">Bỏ chọn chỉ loại bộ khỏi phiên ôn; không gỡ bộ và không xóa tiến độ.</p></div><Link href="/store" className="text-sm font-bold text-accent">Thêm bộ từ →</Link></div>
			<div className="mt-4 flex flex-wrap gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bộ từ…" aria-label="Tìm bộ từ" className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-background px-3" /><button type="button" disabled={busy} onClick={() => void saveSelection(guided.sets.map((set) => set.id))} className="min-h-11 rounded-control border border-border px-3 text-sm font-bold disabled:opacity-40">Chọn tất cả</button><button type="button" disabled={busy} onClick={() => void saveSelection([])} className="min-h-11 rounded-control border border-border px-3 text-sm font-bold disabled:opacity-40">Bỏ chọn tất cả</button></div>
			<ul className="mt-3 max-h-80 divide-y divide-border overflow-y-auto">{filtered.map((set) => <li key={set.id}><label className="flex min-h-14 cursor-pointer items-center gap-3 py-3"><input type="checkbox" checked={selected.has(set.id)} disabled={busy} onChange={(event) => void saveSelection(event.target.checked ? [...guided.selectedSetIds, set.id] : guided.selectedSetIds.filter((id) => id !== set.id))} className="size-5 accent-[var(--color-accent)]" /><span className="min-w-0 flex-1"><span className="block font-bold">{set.title}</span><span className="text-sm text-muted">{set.words} từ</span></span></label></li>)}</ul>
			{filtered.length === 0 && <p className="mt-4 text-sm text-muted">Không tìm thấy bộ từ phù hợp.</p>}
			<div className="sticky bottom-3 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 shadow-md"><p className="text-sm"><strong>{guided.selectedSetIds.length} bộ</strong> · <strong>{guided.uniqueWords} từ</strong> · hôm nay đã luyện <strong>{guided.practicedToday} câu</strong></p><button type="button" disabled={busy || guided.uniqueWords === 0} onClick={() => void start()} className="min-h-11 rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">Bắt đầu ôn →</button></div>
			{error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
		</section>

		<SrsTodayCard overview={overview} compact />

		{session && <GuidedReviewSession initial={session} onClose={(finished) => { setSession(null); if (finished) router.refresh(); }} />}
	</div>;
}
