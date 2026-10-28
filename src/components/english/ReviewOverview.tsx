'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmExitDialog from '@/components/english/ConfirmExitDialog';
import GuidedReviewSession, { type GuidedSession } from '@/components/english/GuidedReviewSession';
import StudySession from '@/components/english/StudySession';
import { englishPost } from '@/components/english/englishApi';
import { EN_GUIDED_CHUNK_SIZE } from '@/lib/english/constants';
import { dueRoundLabel, isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import type { TodayOverview } from '@/services/english/enDailyService';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';

export type GuidedReviewOverview = {
	sets: Array<{ id: string; title: string; words: number }>;
	selectedSetIds: string[];
	uniqueWords: number;
	practicedToday: number;
	activeSessionId: string | null;
};

const solidButton = 'min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50';
const outlineButton = 'min-h-12 w-full rounded-control border-2 border-accent bg-surface px-5 font-bold text-accent disabled:opacity-50';

function StepBadge({ step, recommended }: { step: number; recommended: boolean }) {
	return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${recommended ? 'bg-accent text-accent-foreground' : 'bg-surface-container text-muted'}`}>Bước {step}{recommended ? ' · Làm trước' : ''}</span>;
}

export default function ReviewOverview({ overview, guided: initial }: { overview: TodayOverview; guided: GuidedReviewOverview }) {
	const router = useRouter();
	const [guided, setGuided] = useState(initial);
	const [session, setSession] = useState<GuidedSession | null>(null);
	const [srsOpen, setSrsOpen] = useState(false);
	const [confirmRestart, setConfirmRestart] = useState(false);
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const filtered = useMemo(() => guided.sets.filter((set) => set.title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [guided.sets, search]);
	const selected = new Set(guided.selectedSetIds);
	const allSetIds = guided.sets.map((set) => set.id);
	const allSelected = allSetIds.length > 0 && allSetIds.every((id) => selected.has(id));
	const srsDone = isReviewDone(overview);
	const srsTotal = overview.dueCount + overview.newCount;
	const minutes = reviewMinutes(overview);
	const noSets = guided.sets.length === 0;
	// Scheduled review keeps old words from slipping, so it comes first whenever something is waiting.
	const srsFirst = !srsDone && srsTotal > 0;
	const heading = noSets ? 'Tải bộ từ để bắt đầu' : srsFirst ? `Bước 1: Ôn theo lịch (${srsTotal} từ)` : srsDone ? '✓ Đã ôn theo lịch. Học & luyện thêm nhé' : 'Học & luyện hôm nay';

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
		setConfirmRestart(false);
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
			setGuided((current) => ({ ...current, activeSessionId: null }));
			setError(cause instanceof Error ? cause.message : 'Phiên cũ không còn, hãy bắt đầu phiên mới.');
		} finally {
			setBusy(false);
		}
	}

	const srsCard = <section key="srs" aria-labelledby="srs-review-heading" className={`mode-card relative flex flex-col overflow-hidden p-4 sm:p-6 ${srsFirst ? 'border-2 border-accent' : 'border border-border'}`}>
		<div className="relative flex items-start gap-3">
			<span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-card border-2 border-accent bg-accent-subtle text-2xl shadow-sm">🧠</span>
			<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 id="srs-review-heading" className="text-2xl">Ôn theo lịch</h2><StepBadge step={1} recommended={srsFirst} /></div><p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">Hỏi lại từ đúng lúc sắp quên <InfoHint title={HINTS.srs.title}>{HINTS.srs.body}</InfoHint></p></div>
		</div>
		<div className="relative my-4 flex flex-1 items-center">
			{srsDone ? <p className="text-lg font-bold text-success">✓ Xong hôm nay · mai có <span className="tabular-nums">{overview.tomorrowCount}</span> từ</p> : srsTotal === 0 ? <p className="text-sm text-muted">Chưa có từ để ôn. Tải một bộ từ ở Cửa hàng trước.</p> : <div>
				<p className="flex flex-wrap items-center gap-x-1.5 text-xl font-bold">{dueRoundLabel(overview)}{overview.newCount > 0 && <> · <span className="tabular-nums">{overview.newCount}</span> mới <InfoHint title={HINTS.newWords.title}>{HINTS.newWords.body}</InfoHint></>}</p>
				
				{minutes > 0 && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-sm font-bold text-accent"><span aria-hidden="true">⏱</span>~{minutes} phút</p>}
			</div>}
		</div>
		{!srsDone && <button type="button" disabled={srsTotal === 0} onClick={() => setSrsOpen(true)} className={`relative mt-auto ${srsFirst ? solidButton : outlineButton}`}>Bắt đầu ôn theo lịch <span aria-hidden="true">→</span></button>}
	</section>;

	const guidedCard = <section key="guided" aria-labelledby="guided-review-heading" className={`mode-card relative flex flex-col overflow-hidden p-4 sm:p-6 ${srsFirst ? 'border border-border' : 'border-2 border-accent'}`}>
		<div className="relative flex items-start gap-3">
			<span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-card border-2 border-accent bg-accent-subtle text-2xl shadow-sm">📖</span>
			<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 id="guided-review-heading" className="text-2xl">Học & luyện</h2><StepBadge step={2} recommended={!srsFirst && !noSets} /></div><p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">Xem thẻ {EN_GUIDED_CHUNK_SIZE} từ rồi luyện ngay <InfoHint title={HINTS.guided.title}>{HINTS.guided.body}</InfoHint></p></div>
		</div>

		{guided.activeSessionId && !noSets && <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 rounded-card border border-accent/40 bg-accent-subtle px-3 py-2 text-sm"><span className="font-bold">Bạn có phiên đang dở</span><button type="button" disabled={busy} onClick={() => void resume()} className="min-h-10 rounded-control bg-accent px-4 font-bold text-accent-foreground disabled:opacity-50">Tiếp tục →</button></div>}

		{!noSets ? <div className="relative mt-3 flex flex-col sm:mt-4">
			<p className="mb-2 text-xs font-bold text-muted">Chọn bộ để luyện</p>
			{guided.sets.length > 8 && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bộ từ…" aria-label="Tìm bộ từ" className="mb-2 min-h-10 w-full rounded-control border border-border bg-background px-3 text-sm" />}
			<div className="max-h-32 overflow-y-auto pr-1" aria-label="Chọn bộ từ để ôn">
				<div className="flex flex-wrap gap-2">
					<button type="button" aria-pressed={allSelected} disabled={busy} onClick={() => void saveSelection(allSelected ? [] : allSetIds)} className={`min-h-9 rounded-full border px-3 text-sm font-bold disabled:opacity-40 ${allSelected ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface hover:border-accent'}`}>{allSelected ? '✓ ' : ''}Tất cả</button>
					{filtered.map((set) => {
						const active = selected.has(set.id);
						return <button key={set.id} type="button" aria-pressed={active} disabled={busy} onClick={() => void saveSelection(active ? guided.selectedSetIds.filter((id) => id !== set.id) : [...guided.selectedSetIds, set.id])} title={`${set.title} · ${set.words} từ`} className={`min-h-9 max-w-full truncate rounded-full border px-3 text-sm font-bold disabled:opacity-40 ${active ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface hover:border-accent'}`}>{active ? '✓ ' : ''}{set.title}</button>;
					})}
				</div>
			</div>
			{filtered.length === 0 && <p className="mt-2 text-sm text-muted">Không tìm thấy bộ từ phù hợp.</p>}
			<div className="mt-2 flex items-center justify-between gap-3 text-sm"><p className="font-bold text-foreground-secondary"><span className="tabular-nums">{guided.selectedSetIds.length}</span> bộ · <span className="tabular-nums">{guided.uniqueWords}</span> từ{guided.practicedToday > 0 && <> · hôm nay đã luyện <span className="tabular-nums">{guided.practicedToday}</span> câu</>}</p><Link href="/store" className="shrink-0 font-bold text-accent hover:underline">Thêm bộ từ →</Link></div>
		</div> : <div className="relative mt-5 flex items-center rounded-card border border-dashed border-border bg-surface-secondary p-4"><Link href="/store" className="font-bold text-accent hover:underline">Tải bộ từ ở Cửa hàng →</Link></div>}

		<div className="relative mt-4">
			<button type="button" disabled={busy || guided.uniqueWords === 0} onClick={() => guided.activeSessionId ? setConfirmRestart(true) : void start()} className={srsFirst || guided.activeSessionId ? outlineButton : solidButton}>{guided.activeSessionId ? 'Bắt đầu phiên mới' : 'Bắt đầu học & luyện'} <span aria-hidden="true">→</span></button>
			{error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
		</div>
	</section>;

	return <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8">
		<header className="mb-4 sm:mb-5"><h1 className="text-3xl sm:text-4xl">{heading}</h1></header>
		<div className="grid gap-4 sm:grid-cols-2 sm:gap-5">{srsCard}{guidedCard}</div>

		{srsOpen && <StudySession onClose={(studied) => { setSrsOpen(false); if (studied) router.refresh(); }} />}
		{session && <GuidedReviewSession initial={session} onClose={(finished) => { setGuided((current) => ({ ...current, activeSessionId: finished ? null : session.id })); setSession(null); router.refresh(); }} />}
		<ConfirmExitDialog open={confirmRestart} busy={busy} title="Bắt đầu phiên mới?" description="Phiên đang dở sẽ kết thúc. Các câu bạn đã trả lời vẫn được giữ." stayLabel="Huỷ" leaveLabel="Bắt đầu mới" onStay={() => setConfirmRestart(false)} onLeave={() => void start()} />
	</div>;
}
