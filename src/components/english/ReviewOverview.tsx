'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmExitDialog from '@/components/english/ConfirmExitDialog';
import GuidedReviewSession, { type GuidedSession } from '@/components/english/GuidedReviewSession';
import SrsPanel from '@/components/english/SrsPanel';
import Checkbox from '@/components/ui/Checkbox';
import { englishPost } from '@/components/english/englishApi';
import InfoHint from '@/components/ui/InfoHint';
import { EN_GUIDED_CHUNK_SIZE } from '@/lib/english/constants';
import { HINTS } from '@/lib/english/hintCopy';
import type { TodayOverview } from '@/services/english/enDailyService';

export type GuidedReviewOverview = {
	sets: Array<{ id: string; title: string; words: number }>;
	selectedSetIds: string[];
	uniqueWords: number;
	practicedToday: number;
	activeSessionId: string | null;
};

const solidButton = 'min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50';
const outlineButton = 'min-h-12 w-full rounded-control border-2 border-accent bg-surface px-5 font-bold text-accent disabled:opacity-50';

export default function ReviewOverview({ overview, guided: initial, mode }: { overview: TodayOverview; guided: GuidedReviewOverview; mode: 'bo' | 'luan-phien' }) {
	const router = useRouter();
	const [guided, setGuided] = useState(initial);
	const [session, setSession] = useState<GuidedSession | null>(null);
	const [confirmRestart, setConfirmRestart] = useState(false);
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const saveRun = useRef(0);
	const saveQueue = useRef<Promise<void>>(Promise.resolve());
	const filtered = useMemo(() => guided.sets.filter((set) => set.title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [guided.sets, search]);
	const selected = new Set(guided.selectedSetIds);
	const allSetIds = guided.sets.map((set) => set.id);
	const allSelected = allSetIds.length > 0 && allSetIds.every((id) => selected.has(id));
	const noSets = guided.sets.length === 0;

	/** Update immediately, but serialize writes so older choices cannot overwrite newer ones. */
	function saveSelection(setIds: string[]) {
		const run = ++saveRun.current;
		setGuided((current) => ({ ...current, selectedSetIds: setIds }));
		setSaving(true);
		setError('');
		saveQueue.current = saveQueue.current.then(async () => {
			try {
				const saved = await englishPost<GuidedReviewOverview>('/api/review', { action: 'selection', setIds });
				if (run === saveRun.current) setGuided(saved);
			} catch (cause) {
				if (run === saveRun.current) setError(cause instanceof Error ? cause.message : 'Không lưu được lựa chọn.');
			} finally {
				if (run === saveRun.current) setSaving(false);
			}
		});
	}

	async function start() {
		setConfirmRestart(false);
		setBusy(true);
		setError('');
		try {
			const started = await englishPost<GuidedSession>('/api/review', { action: 'start', setIds: guided.selectedSetIds });
			setGuided((current) => ({ ...current, activeSessionId: started.id }));
			setSession(started);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không bắt đầu được phiên học.');
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
			setGuided((current) => ({ ...current, activeSessionId: null }));
			setError(cause instanceof Error ? cause.message : 'Phiên cũ không còn, hãy bắt đầu phiên mới.');
		} finally {
			setBusy(false);
		}
	}

	return <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
		<header className="mb-4 sm:mb-5"><h1 className="text-3xl sm:text-4xl">Ôn tập</h1></header>
		<div role="group" aria-label="Chế độ ôn tập" className="mb-5 flex rounded-control border border-border bg-surface p-1">
			{([['bo', 'Ôn theo bộ'], ['luan-phien', 'Ôn luân phiên']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => router.replace(`/review?mode=${value}`)} className={`min-h-11 flex-1 rounded-control px-2 text-sm font-bold ${mode === value ? 'bg-accent text-accent-foreground' : 'text-muted'}`}>{label}</button>)}
		</div>
		{mode === 'luan-phien' ? <SrsPanel overview={overview} /> : <>
		<div className="mb-4"><h2 className="flex items-center gap-2 text-2xl">Ôn theo bộ <InfoHint title={HINTS.guided.title}>{HINTS.guided.body}</InfoHint></h2><p className="mt-1 text-sm text-muted">Chọn bộ, học từng chặng {EN_GUIDED_CHUNK_SIZE} từ rồi làm {EN_GUIDED_CHUNK_SIZE} câu.</p></div>

		{noSets ? <section className="mode-card text-center">
			<h2 className="text-2xl">Chưa có bộ từ</h2>
			<p className="mt-1 text-sm text-muted">Tải một bộ để có từ học thêm.</p>
			<Link href="/store" className="mt-4 inline-flex min-h-12 items-center rounded-control bg-accent px-5 font-bold text-accent-foreground">Chọn bộ từ →</Link>
		</section> : <section aria-label="Ôn theo bộ" className="mode-card space-y-4 p-4 sm:p-6">
			{guided.activeSessionId && <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-accent/40 bg-accent-subtle px-3 py-2 text-sm"><span className="font-bold">Bạn có phiên đang dở</span><button type="button" disabled={busy} onClick={() => void resume()} className="min-h-11 rounded-control bg-accent px-4 font-bold text-accent-foreground disabled:opacity-50">Tiếp tục →</button></div>}

			<div>
				<p className="mb-2 text-sm font-bold">Chọn bộ để học</p>
				{guided.sets.length > 8 && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bộ từ…" aria-label="Tìm bộ từ" className="mb-2 min-h-11 w-full rounded-control border border-border bg-background px-3 text-sm" />}
				<div className="max-h-60 overflow-y-auto divide-y divide-border" aria-label="Chọn bộ từ để học">
					<Checkbox label="Tất cả" checked={allSelected} disabled={busy} onChange={() => saveSelection(allSelected ? [] : allSetIds)} className="w-full px-2 font-bold" />
					{filtered.map((set) => <div key={set.id} className="flex items-center justify-between gap-3"><Checkbox label={set.title} checked={selected.has(set.id)} disabled={busy} onChange={() => saveSelection(selected.has(set.id) ? guided.selectedSetIds.filter((id) => id !== set.id) : [...guided.selectedSetIds, set.id])} className="min-w-0 flex-1 px-2 font-bold" /><span className="shrink-0 text-sm text-muted">{set.words} từ</span></div>)}
				</div>
				{filtered.length === 0 && <p className="mt-2 text-sm text-muted">Không tìm thấy bộ từ phù hợp.</p>}
				<div className="mt-2 flex items-center justify-between gap-3 text-sm">
					<p className={`font-bold text-foreground-secondary ${saving ? 'opacity-60' : ''}`} aria-live="polite"><span className="tabular-nums">{guided.selectedSetIds.length}</span> bộ · <span className="tabular-nums">{guided.uniqueWords}</span> từ{guided.practicedToday > 0 && <> · hôm nay đã luyện <span className="tabular-nums">{guided.practicedToday}</span> câu</>}</p>
					<Link href="/store" className="inline-flex min-h-11 shrink-0 items-center font-bold text-accent hover:underline">+ Thêm bộ</Link>
				</div>
			</div>

			<div>
				<button type="button" disabled={busy || saving || guided.selectedSetIds.length === 0 || guided.uniqueWords === 0} onClick={() => guided.activeSessionId ? setConfirmRestart(true) : void start()} className={guided.activeSessionId ? outlineButton : solidButton}>{guided.activeSessionId ? 'Bắt đầu phiên mới' : 'Bắt đầu học'} <span aria-hidden="true">→</span></button>
				{error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
			</div>
		</section>}

		</>}
		{session && <GuidedReviewSession initial={session} onClose={(finished) => { setGuided((current) => ({ ...current, activeSessionId: finished ? null : session.id })); setSession(null); router.refresh(); }} />}
		<ConfirmExitDialog open={confirmRestart} busy={busy} title="Bắt đầu phiên mới?" description="Phiên đang dở sẽ kết thúc. Các câu bạn đã trả lời vẫn được giữ." stayLabel="Huỷ" leaveLabel="Bắt đầu mới" onStay={() => setConfirmRestart(false)} onLeave={() => void start()} />
	</div>;
}
