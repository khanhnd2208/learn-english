'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import GuidedReviewSession, { type GuidedSession } from '@/components/english/GuidedReviewSession';
import Checkbox from '@/components/ui/Checkbox';
import { englishPost } from '@/components/english/englishApi';
import InfoHint from '@/components/ui/InfoHint';
import AdvancedToggle from '@/components/english/advanced/AdvancedToggle';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Sheet from '@/components/ui/Sheet';
import SetWordListDialog from '@/components/english/SetWordListDialog';
import { GUIDED_MODE_LABEL, type GuidedQuestionMode } from '@/lib/english/guidedReview';
import { EN_GUIDED_CHUNK_SIZE } from '@/lib/english/constants';
import { HINTS } from '@/lib/english/hintCopy';

export type GuidedReviewOverview = {
	sets: Array<{ id: string; title: string; words: number }>;
	selectedSetIds: string[];
	uniqueWords: number;
	practicedToday: number;
};

const QUESTION_MODES: Array<[GuidedQuestionMode, string, string]> = [
	['mix', 'shuffle', 'Kết hợp chọn nghĩa, điền câu và nghe viết.'],
	['meaning_choice', 'translate', 'Nhìn từ tiếng Anh và chọn nghĩa đúng.'],
	['cloze_choice', 'edit_note', 'Chọn từ đúng để điền vào câu.'],
	['listen_type', 'headphones', 'Nghe phát âm và gõ từ bạn nghe được.'],
];

const solidButton = 'min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50';

export default function ReviewOverview({ guided: initial }: { guided: GuidedReviewOverview }) {
	const router = useRouter();
	const [guided, setGuided] = useState(initial);
	const [session, setSession] = useState<GuidedSession | null>(null);
	const [search, setSearch] = useState('');
	const [questionMode, setQuestionMode] = useState<GuidedQuestionMode>('mix');
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [openSet, setOpenSet] = useState<{ id: string; title: string } | null>(null);
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
		setBusy(true);
		setError('');
		try {
			const started = await englishPost<GuidedSession>('/api/review', { action: 'start', setIds: guided.selectedSetIds, questionMode });
			setSession(started);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không bắt đầu được phiên học.');
		} finally {
			setBusy(false);
		}
	}

	return <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-8">
		<header className="mb-3.5 flex items-center justify-between gap-2 sm:mb-5"><h1 className="text-2xl sm:text-4xl">Ôn theo bộ</h1><button type="button" title="Cài đặt câu hỏi" aria-label="Cài đặt câu hỏi" onClick={() => setSettingsOpen(true)} className="flex size-11 items-center justify-center rounded-control text-accent hover:bg-accent-subtle"><MaterialIcon name="tune" size={22} /></button></header>
		<>
		{noSets ? <section className="mode-card text-center">
			<h2 className="text-2xl">Chưa có bộ từ</h2>
			<p className="mt-1 text-sm text-muted">Tải một bộ để có từ học thêm.</p>
			<Link href="/store" className="mt-4 inline-flex min-h-12 items-center rounded-control bg-accent px-5 font-bold text-accent-foreground">Chọn bộ từ →</Link>
		</section> : <section aria-label="Ôn theo bộ" className="mode-card space-y-4 p-4 sm:p-6">
			<div>
				<div className="mb-2 flex items-center justify-between gap-2">
					<p className="flex items-center gap-1.5 text-sm font-bold">Bộ đang học <InfoHint title={HINTS.guided.title}>{HINTS.guided.body}</InfoHint></p>
					<Link href="/store" className="text-sm font-bold text-accent">+ Thêm bộ</Link>
				</div>
				{guided.sets.length > 8 && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bộ từ…" aria-label="Tìm bộ từ" className="mb-2 min-h-11 w-full rounded-control border border-border bg-background px-3 text-sm" />}
				<div className="max-h-60 overflow-y-auto divide-y divide-border" aria-label="Chọn bộ từ để học">
					<Checkbox label="Tất cả" checked={allSelected} disabled={busy} onChange={() => saveSelection(allSelected ? [] : allSetIds)} className="w-full px-2 font-bold" />
					{filtered.map((set) => <div key={set.id} className="flex items-center justify-between gap-2"><Checkbox label={set.title} checked={selected.has(set.id)} disabled={busy} onChange={() => saveSelection(selected.has(set.id) ? guided.selectedSetIds.filter((id) => id !== set.id) : [...guided.selectedSetIds, set.id])} className="min-w-0 flex-1 px-2 font-bold" /><span className="shrink-0 text-xs text-muted sm:text-sm">{set.words} từ</span><button type="button" title="Xem từ trong bộ" aria-label={`Xem từ trong bộ ${set.title}`} onClick={() => setOpenSet({ id: set.id, title: set.title })} className="flex size-11 shrink-0 items-center justify-center rounded-control text-accent hover:bg-accent-subtle focus-visible:ring-2 focus-visible:ring-accent"><MaterialIcon name="menu_book" size={22} /></button></div>)}
				</div>
				{filtered.length === 0 && <p className="mt-2 text-sm text-muted">Không tìm thấy bộ từ phù hợp.</p>}
				<div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">
					<p className={`font-bold text-foreground-secondary ${saving ? 'opacity-60' : ''}`} aria-live="polite">{guided.selectedSetIds.length === 0 ? 'Chọn ít nhất một bộ để bắt đầu.' : <><span className="tabular-nums">{guided.selectedSetIds.length}</span> bộ · <span className="tabular-nums">{guided.uniqueWords}</span> từ</>}{guided.practicedToday > 0 && <> · đã luyện <span className="tabular-nums">{guided.practicedToday}</span> câu</>}</p>
				</div>
			</div>

			<div>
				<button type="button" disabled={busy || saving || guided.selectedSetIds.length === 0 || guided.uniqueWords === 0} onClick={() => void start()} className={solidButton}>{busy ? 'Đang chuẩn bị…' : 'Bắt đầu học'} <span aria-hidden="true">→</span></button>
				<p className="mt-2 text-center text-xs text-muted">{EN_GUIDED_CHUNK_SIZE} từ / chặng · {GUIDED_MODE_LABEL[questionMode]}</p>
				{error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
			</div>
		</section>}

		</>
		<Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Cài đặt câu hỏi"><fieldset disabled={busy}><legend className="mb-2 text-sm font-bold">Dạng câu hỏi</legend><div className="space-y-2">{QUESTION_MODES.map(([value, icon, description]) => <label key={value} className="flex cursor-pointer items-center gap-3 rounded-control border border-border p-3"><input type="radio" name="guided-question-mode" checked={questionMode === value} onChange={() => setQuestionMode(value)} /><MaterialIcon name={icon} size={20} className="text-accent" /><span><b>{GUIDED_MODE_LABEL[value]}</b><span className="block text-xs text-muted">{description}</span></span></label>)}</div><div className="mt-4 border-t border-border pt-3"><AdvancedToggle disabled={busy} /><p className="mt-1 text-xs text-muted">Hiện thêm cụm từ và cách dùng trên thẻ học.</p></div></fieldset></Sheet>
		{session && <GuidedReviewSession initial={session} onClose={() => { setSession(null); router.refresh(); }} />}
		<SetWordListDialog set={openSet} onClose={() => setOpenSet(null)} />
	</div>;
}
