'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DueForecast from '@/components/english/DueForecast';
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
		if (guided.activeSessionId) return;
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

	async function resume() {
		if (!guided.activeSessionId) return;
		setBusy(true);
		setError('');
		try {
			setSession(await englishPost<GuidedSession>('/api/review', { action: 'open', sessionId: guided.activeSessionId }));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không mở được phiên đang học.');
		} finally {
			setBusy(false);
		}
	}

	async function replaceActive() {
		if (!guided.activeSessionId) return;
		setBusy(true);
		setError('');
		try {
			await englishPost('/api/review', { action: 'finish', sessionId: guided.activeSessionId });
			const started = await englishPost<GuidedSession>('/api/review', { action: 'start', setIds: guided.selectedSetIds });
			setGuided((current) => ({ ...current, activeSessionId: started.id }));
			setSession(started);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không thể bắt đầu phiên mới.');
		} finally {
			setBusy(false);
		}
	}

	return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
		<header><h1 className="text-4xl sm:text-5xl">Ôn tập</h1><p className="mt-2 text-muted">Mỗi chặng: xem kỹ tối đa 5 từ, rồi luyện một câu cho từng từ. Kết quả ở đây không thay đổi lịch nhớ lâu.</p></header>

		<section className="mode-card border-2 border-accent sm:p-7">
			<dl className="grid grid-cols-3 gap-3 text-center">
				<div><dd className="game-number text-4xl">{guided.selectedSetIds.length}</dd><dt className="text-xs text-muted">bộ đã chọn</dt></div>
				<div><dd className="game-number text-4xl">{guided.uniqueWords}</dd><dt className="text-xs text-muted">từ không trùng</dt></div>
				<div><dd className="game-number text-4xl">{guided.practicedToday}</dd><dt className="text-xs text-muted">đã luyện hôm nay</dt></div>
			</dl>
			{guided.activeSessionId ? <div className="mt-6 text-center"><p className="font-bold">Bạn có một phiên đang dở.</p><div className="mt-3 flex flex-wrap justify-center gap-3"><button type="button" disabled={busy} onClick={() => void resume()} className="min-h-12 rounded-control bg-accent px-6 font-bold text-accent-foreground disabled:opacity-50">Tiếp tục phiên →</button><button type="button" disabled={busy || guided.selectedSetIds.length === 0} onClick={() => void replaceActive()} className="min-h-12 rounded-control border border-border px-5 font-bold disabled:opacity-50">Kết thúc phiên cũ, bắt đầu mới</button></div></div> : <div className="mt-6 text-center"><button type="button" disabled={busy || guided.uniqueWords === 0} onClick={() => void start()} className="min-h-12 rounded-control bg-accent px-6 text-lg font-bold text-accent-foreground disabled:opacity-50">Bắt đầu · 5 từ mỗi chặng →</button></div>}
			{error && <p role="alert" className="mt-3 text-center text-sm text-error">{error}</p>}
		</section>

		<section className="mode-card">
			<div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl">Chọn bộ từ để ôn</h2><p className="mt-1 text-sm text-muted">Bỏ chọn chỉ loại bộ khỏi phiên ôn; không gỡ bộ và không xóa tiến độ.</p></div><Link href="/store" className="text-sm font-bold text-accent">Thêm bộ từ →</Link></div>
			<div className="mt-4 flex flex-wrap gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bộ từ…" aria-label="Tìm bộ từ" className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-background px-3" /><button type="button" disabled={busy || Boolean(guided.activeSessionId)} onClick={() => void saveSelection(guided.sets.map((set) => set.id))} className="min-h-11 rounded-control border border-border px-3 text-sm font-bold disabled:opacity-40">Chọn tất cả</button><button type="button" disabled={busy || Boolean(guided.activeSessionId)} onClick={() => void saveSelection([])} className="min-h-11 rounded-control border border-border px-3 text-sm font-bold disabled:opacity-40">Bỏ chọn tất cả</button></div>
			{guided.activeSessionId && <p className="mt-3 text-xs text-muted">Lựa chọn được khóa trong khi phiên đang hoạt động.</p>}
			<ul className="mt-3 max-h-80 divide-y divide-border overflow-y-auto">{filtered.map((set) => <li key={set.id}><label className="flex min-h-14 cursor-pointer items-center gap-3 py-3"><input type="checkbox" checked={selected.has(set.id)} disabled={busy || Boolean(guided.activeSessionId)} onChange={(event) => void saveSelection(event.target.checked ? [...guided.selectedSetIds, set.id] : guided.selectedSetIds.filter((id) => id !== set.id))} className="size-5 accent-[var(--color-accent)]" /><span className="min-w-0 flex-1"><span className="block font-bold">{set.title}</span><span className="text-sm text-muted">{set.words} từ</span></span></label></li>)}</ul>
			{filtered.length === 0 && <p className="mt-4 text-sm text-muted">Không tìm thấy bộ từ phù hợp.</p>}
		</section>

		<div className="grid gap-4 md:grid-cols-2"><section className="mode-card"><h2 className="text-2xl">Lịch nhớ lâu vẫn được giữ</h2><p className="mt-2 text-sm text-muted">Phiên luyện này không tăng bậc, giảm số từ đến hạn hoặc thay đổi ngày ôn. Hiện có {overview.dueTotal} từ đến hạn trong dữ liệu lịch cũ.</p></section><section className="mode-card"><h2 className="text-2xl">Lịch 7 ngày tới</h2><div className="mt-4"><DueForecast days={overview.dueNext7Days} /></div></section></div>

		{session && <GuidedReviewSession initial={session} onClose={(finished) => { setSession(null); if (finished) router.refresh(); }} />}
	</div>;
}
