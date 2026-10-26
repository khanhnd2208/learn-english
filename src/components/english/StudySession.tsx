'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import { englishPost } from '@/components/english/englishApi';
import { exampleParts, type BundleExample, type SenseBundle } from '@/lib/english/senseBundle';
import { intervalDays, isLongTerm } from '@/lib/english/schedule';
import type { DailyAnswerResult, DailyItem } from '@/services/english/enDailyService';

type Started = { sessionId: string | null; dueCount: number; newCount: number; dueTotal: number; items: DailyItem[] };
type Step = { key: string; item: DailyItem; mode: 'intro' | 'recall'; retry: boolean };
type Feedback = { result: 'correct' | 'wrong'; typed: string; boxBefore: number; boxAfter: number; scheduled: boolean };
type Outcome = { item: DailyItem; correct: boolean; boxBefore: number; boxAfter: number };
type Finished = { remaining: number; tomorrowCount: number; longTermCount: number };

/** Steps another card waits before a new word's first recall, so recall is not just copying. */
const NEW_WORD_GAP = 3;
const CORRECT_ADVANCE_MS = 1400;

function hasAudio(bundle: SenseBundle): boolean {
	return Boolean(bundle.word.audioPath || bundle.word.audioUkPath || bundle.word.audioUsPath);
}

function ipaOf(bundle: SenseBundle): string {
	const ipa = bundle.sense.ipaOverride || bundle.word.ipa;
	return ipa ? (ipa.startsWith('/') ? ipa : `/${ipa}/`) : '';
}

function Example({ example }: { example: BundleExample }) {
	const parts = exampleParts(example);
	return <div className="rounded-panel border border-border/70 bg-surface-secondary px-4 py-3">
		<p className="text-[15px] leading-relaxed text-foreground">{parts ? <>{parts.before}<mark className="rounded bg-accent-subtle px-0.5 font-bold text-accent">{parts.answer}</mark>{parts.after}</> : example.english}</p>
		{example.meaningVi && <p className="mt-1 text-sm text-muted">{example.meaningVi}</p>}
	</div>;
}

function WordHeader({ bundle, autoPlay }: { bundle: SenseBundle; autoPlay: boolean }) {
	return <div className="flex items-start justify-between gap-4">
		<div className="min-w-0">
			<p role="heading" aria-level={2} className="break-words font-sans text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">{bundle.word.lemma}</p>
			<p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
				{ipaOf(bundle) && <span className="font-mono">{ipaOf(bundle)}</span>}
				{bundle.sense.partOfSpeech && <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-bold">{bundle.sense.partOfSpeech}</span>}
			</p>
		</div>
		<EnglishAudioButton key={`${bundle.sense.id}-${autoPlay}`} compact autoPlay={autoPlay} senseId={bundle.sense.id} lemma={bundle.word.lemma} recordedAudioAvailable={hasAudio(bundle)} />
	</div>;
}

function WordDetails({ bundle, showMeaning = true }: { bundle: SenseBundle; showMeaning?: boolean }) {
	return <div className="space-y-3">
		{showMeaning && <p className="text-xl font-bold text-foreground">{bundle.sense.meaningVi}</p>}
		{bundle.sense.definitionEnSimple && <p className="text-sm text-foreground-secondary">{bundle.sense.definitionEnSimple}</p>}
		{bundle.examples.slice(0, 2).map((example) => <Example key={example.id} example={example} />)}
		{bundle.sense.pitfallVi && <p className="flex gap-2 rounded-panel border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground-secondary"><MaterialIcon name="lightbulb" size={18} className="mt-0.5 text-warning" /><span>{bundle.sense.pitfallVi}</span></p>}
	</div>;
}

function LetterHint({ lemma }: { lemma: string }) {
	return <p aria-label={`Gợi ý: bắt đầu bằng ${lemma[0]}, ${lemma.length} ký tự`} className="flex flex-wrap justify-center gap-1 font-mono text-lg font-bold">
		{[...lemma].map((char, index) => <span key={index} className={`inline-flex h-9 w-7 items-center justify-center rounded-md border ${char === ' ' ? 'border-transparent' : 'border-border bg-surface'}`}>{index === 0 ? char : char === ' ' || char === '-' ? char : ''}</span>)}
	</p>;
}

function scheduleNote(feedback: Feedback): string {
	if (!feedback.scheduled) return 'Lượt làm lại không đổi lịch ôn.';
	const days = intervalDays(feedback.boxAfter);
	if (feedback.result === 'wrong') return 'Sẽ ôn lại vào ngày mai.';
	if (isLongTerm(feedback.boxAfter) && !isLongTerm(feedback.boxBefore)) return `Vào nhóm Nhớ lâu · ôn lại sau ${days} ngày.`;
	return `Ôn lại sau ${days} ngày.`;
}

export default function StudySession({ onClose }: { onClose: (studied: boolean) => void }) {
	const [phase, setPhase] = useState<'loading' | 'study' | 'summary' | 'error'>('loading');
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [steps, setSteps] = useState<Step[]>([]);
	const [pos, setPos] = useState(0);
	const [answer, setAnswer] = useState('');
	const [typoChecked, setTypoChecked] = useState(false);
	const [nearMiss, setNearMiss] = useState(false);
	const [feedback, setFeedback] = useState<Feedback | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [outcomes, setOutcomes] = useState<Outcome[]>([]);
	const [finished, setFinished] = useState<Finished | null>(null);
	const answeredAny = useRef(false);
	const shownAt = useRef(0);
	const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const step = steps[pos];

	const onCloseRef = useRef(onClose);
	useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

	/** Show the card at `index` with a clean answer box and a fresh response timer. */
	const goTo = useCallback((index: number) => {
		shownAt.current = Date.now();
		setAnswer('');
		setTypoChecked(false);
		setNearMiss(false);
		setFeedback(null);
		setPos(index);
	}, []);

	const apply = useCallback((started: Started) => {
		if (!started.sessionId || !started.items.length) { onCloseRef.current(answeredAny.current); return; }
		setSessionId(started.sessionId);
		setSteps(started.items.map((item) => ({ key: `${item.senseId}-${item.kind}`, item, mode: item.kind === 'new' ? 'intro' : 'recall', retry: false })));
		setOutcomes([]);
		setFinished(null);
		goTo(0);
		setPhase('study');
	}, [goTo]);

	const fail = useCallback((cause: unknown) => {
		setError(cause instanceof Error ? cause.message : 'Không tải được bài học hôm nay.');
		setPhase('error');
	}, []);

	const load = useCallback(() => englishPost<Started>('/api/daily/start', {}).then(apply, fail), [apply, fail]);

	useEffect(() => {
		let active = true;
		englishPost<Started>('/api/daily/start', {}).then((started) => { if (active) apply(started); }, (cause) => { if (active) fail(cause); });
		return () => { active = false; };
	}, [apply, fail]);

	function start() {
		setPhase('loading');
		setError('');
		void load();
	}

	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = previous; };
	}, []);

	const finish = useCallback(async () => {
		if (!sessionId) return;
		setPhase('summary');
		try {
			setFinished(await englishPost<Finished>('/api/daily/finish', { sessionId }));
		} catch {
			setFinished({ remaining: 0, tomorrowCount: 0, longTermCount: 0 });
		}
	}, [sessionId]);

	const next = useCallback(() => {
		if (advanceTimer.current) clearTimeout(advanceTimer.current);
		advanceTimer.current = null;
		if (pos + 1 >= steps.length) { void finish(); return; }
		goTo(pos + 1);
	}, [finish, goTo, pos, steps.length]);

	function continueIntro() {
		if (!step) return;
		const recall: Step = { key: `${step.item.senseId}-recall`, item: step.item, mode: 'recall', retry: false };
		setSteps((current) => {
			const copy = [...current];
			copy.splice(Math.min(copy.length, pos + 1 + NEW_WORD_GAP), 0, recall);
			return copy;
		});
		goTo(pos + 1);
	}

	useEffect(() => {
		if (phase !== 'study' || !step) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Enter' || event.isComposing) return;
			if (step.mode === 'intro') { event.preventDefault(); continueIntro(); return; }
			if (feedback) { event.preventDefault(); next(); }
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	async function submit(event?: FormEvent<HTMLFormElement>, giveUp = false) {
		event?.preventDefault();
		if (!sessionId || !step || busy || feedback) return;
		if (!giveUp && !answer.trim()) { inputRef.current?.focus(); return; }
		setBusy(true);
		setError('');
		try {
			const result = await englishPost<DailyAnswerResult>('/api/daily/answer', {
				sessionId,
				senseId: step.item.senseId,
				answer: giveUp ? '' : answer,
				prompt: step.item.prompt,
				responseMs: Date.now() - shownAt.current,
				giveUp,
				typoChecked,
			});
			if (result.result === 'near') {
				setNearMiss(true);
				setTypoChecked(true);
				inputRef.current?.select();
				return;
			}
			answeredAny.current = true;
			const correct = result.result === 'correct';
			setFeedback({ result: result.result, typed: giveUp ? '' : answer.trim(), boxBefore: result.boxBefore, boxAfter: result.boxAfter, scheduled: result.scheduled });
			if (!step.retry) setOutcomes((current) => current.some((outcome) => outcome.item.senseId === step.item.senseId) ? current : [...current, { item: step.item, correct, boxBefore: result.boxBefore, boxAfter: result.boxAfter }]);
			if (!correct && !step.retry) setSteps((current) => [...current, { key: `${step.item.senseId}-retry`, item: step.item, mode: 'recall', retry: true }]);
			if (correct) advanceTimer.current = setTimeout(next, CORRECT_ADVANCE_MS);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không ghi nhận được câu trả lời.');
		} finally {
			setBusy(false);
		}
	}

	useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

	async function close() {
		if (phase === 'study' && answeredAny.current && sessionId) await englishPost('/api/daily/finish', { sessionId }).catch(() => undefined);
		onClose(answeredAny.current);
	}

	// Each pending intro will add one recall card, so count it now and keep the total steady.
	const total = steps.length + steps.filter((entry, index) => index >= pos && entry.mode === 'intro').length;
	const done = phase === 'summary' ? total : pos;

	return <div role="dialog" aria-modal="true" aria-label="Phiên học hôm nay" className="fixed inset-0 z-[70] overflow-y-auto bg-background">
		<div className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
			<div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
				<button type="button" onClick={() => void close()} aria-label="Thoát phiên học" className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><MaterialIcon name="close" size={22} /></button>
				<div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-subtle" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
					<div className="h-full rounded-full bg-accent transition-all duration-500 ease-out" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
				</div>
				<span className="min-w-12 text-right text-xs font-bold tabular-nums text-muted">{Math.min(done + (phase === 'study' ? 1 : 0), total)}/{total}</span>
			</div>
		</div>

		<div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
			{phase === 'loading' && <div className="space-y-4" aria-busy="true"><div className="h-6 w-32 animate-pulse rounded-full bg-surface-container" /><div className="h-64 animate-pulse rounded-panel bg-surface-container" /></div>}

			{phase === 'error' && <div className="space-y-4 rounded-panel border border-border bg-surface p-6 text-center"><p className="font-bold">{error}</p><div className="flex justify-center gap-2"><Button onClick={start}>Thử lại</Button><Button variant="ghost" onClick={() => onClose(false)}>Đóng</Button></div></div>}

			{phase === 'study' && step && <div key={step.key + pos} className="animate-fade-slide-up space-y-5">
				<p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]">
					{step.retry ? <span className="text-warning">Làm lại</span> : step.item.kind === 'new' ? <span className="text-accent">{step.mode === 'intro' ? 'Từ mới' : 'Từ mới · tự nhớ'}</span> : <span className="text-success">Ôn tập</span>}
				</p>

				{step.mode === 'intro' ? <section className="space-y-6 rounded-dialog border border-border bg-surface p-5 shadow-elevated sm:p-8">
					<WordHeader bundle={step.item.bundle} autoPlay />
					<WordDetails bundle={step.item.bundle} />
					<Button size="lg" fullWidth onClick={continueIntro} rightIcon={<kbd className="hidden rounded border border-white/30 px-1.5 text-[10px] sm:inline">Enter</kbd>}>Đã ghi nhớ</Button>
					<p className="text-center text-xs text-muted">Bạn sẽ phải tự gõ lại từ này sau vài thẻ nữa.</p>
				</section> : <section className="space-y-6 rounded-dialog border border-border bg-surface p-5 shadow-elevated sm:p-8">
					<div className="space-y-3 text-center">
						{step.item.prompt === 'listen' ? <>
							<div className="flex justify-center"><EnglishAudioButton key={step.key + pos} compact autoPlay senseId={step.item.bundle.sense.id} lemma={step.item.bundle.word.lemma} recordedAudioAvailable={hasAudio(step.item.bundle)} /></div>
							<p className="text-sm text-muted">Nghe và gõ lại từ bạn nghe được</p>
						</> : step.item.prompt === 'cloze' && step.item.cloze ? <>
							<p className="text-sm text-muted">Điền từ còn thiếu</p>
							<p className="text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">{step.item.cloze.before}<span className="mx-1 inline-block min-w-16 border-b-2 border-accent align-baseline" aria-label="chỗ trống">&nbsp;</span>{step.item.cloze.after}</p>
							{step.item.cloze.meaningVi && <p className="text-sm text-muted">{step.item.cloze.meaningVi}</p>}
						</> : <>
							<p className="text-sm text-muted">Từ tiếng Anh nào có nghĩa là</p>
							<p className="text-2xl font-black leading-snug text-foreground sm:text-3xl">{step.item.bundle.sense.meaningVi}</p>
							{step.item.bundle.sense.partOfSpeech && <p className="text-xs font-bold text-muted">({step.item.bundle.sense.partOfSpeech})</p>}
						</>}
					</div>

					{step.retry && !feedback && <LetterHint lemma={step.item.bundle.word.lemma} />}

					{!feedback ? <form onSubmit={(event) => void submit(event)} className="space-y-3">
						<input
							ref={inputRef}
							autoFocus
							aria-label="Gõ từ tiếng Anh"
							autoComplete="off"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							enterKeyHint="done"
							placeholder="Gõ từ tiếng Anh…"
							value={answer}
							onChange={(event) => { setAnswer(event.target.value); setNearMiss(false); }}
							className={`h-14 w-full rounded-panel border-2 bg-background px-4 text-center text-2xl font-bold tracking-wide text-foreground outline-none transition placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted focus:border-accent ${nearMiss ? 'border-warning' : 'border-border'}`}
						/>
						{nearMiss && <p role="status" className="text-center text-sm font-bold text-warning">Gần đúng rồi. Kiểm tra lại chính tả rồi gửi lần nữa.</p>}
						<div className="flex flex-col-reverse gap-2 sm:flex-row">
							<Button variant="ghost" size="lg" className="sm:flex-1" disabled={busy} onClick={() => void submit(undefined, true)}>Tôi chưa nhớ</Button>
							<Button type="submit" size="lg" className="sm:flex-[2]" loading={busy} disabled={!answer.trim()}>Kiểm tra</Button>
						</div>
					</form> : <div role="status" className={`space-y-4 rounded-panel border-2 p-4 ${feedback.result === 'correct' ? 'border-success/40 bg-success-subtle' : 'border-error/30 bg-error/5'}`}>
						<p className={`flex items-center gap-2 font-black ${feedback.result === 'correct' ? 'text-success' : 'text-error'}`}>
							<MaterialIcon name={feedback.result === 'correct' ? 'check_circle' : 'cancel'} filled size={22} />
							{feedback.result === 'correct' ? 'Chính xác' : feedback.typed ? 'Chưa đúng' : 'Đáp án'}
						</p>
						{feedback.result === 'wrong' && feedback.typed && <p className="text-sm text-muted">Bạn gõ: <span className="font-mono text-error line-through">{feedback.typed}</span></p>}
						<WordHeader bundle={step.item.bundle} autoPlay />
						{feedback.result === 'wrong' ? <WordDetails bundle={step.item.bundle} showMeaning={step.item.prompt !== 'meaning'} /> : step.item.prompt !== 'meaning' && <p className="text-foreground-secondary">{step.item.bundle.sense.meaningVi}</p>}
						<p className="text-xs font-bold text-muted">{scheduleNote(feedback)}{feedback.result === 'wrong' && !step.retry ? ' Từ này sẽ quay lại cuối phiên.' : ''}</p>
						<Button size="lg" fullWidth variant={feedback.result === 'correct' ? 'secondary' : 'primary'} onClick={next} rightIcon={<kbd className="hidden rounded border border-current/30 px-1.5 text-[10px] sm:inline">Enter</kbd>}>Tiếp tục</Button>
					</div>}
				</section>}
				{error && <p role="alert" className="text-center text-sm text-error">{error}</p>}
			</div>}

			{phase === 'summary' && <Summary outcomes={outcomes} finished={finished} onMore={start} onDone={() => onClose(true)} />}
		</div>
	</div>;
}

function Summary({ outcomes, finished, onMore, onDone }: { outcomes: Outcome[]; finished: Finished | null; onMore: () => void; onDone: () => void }) {
	const remembered = outcomes.filter((outcome) => outcome.correct).length;
	const learned = outcomes.filter((outcome) => outcome.item.kind === 'new').length;
	const promoted = outcomes.filter((outcome) => isLongTerm(outcome.boxAfter) && !isLongTerm(outcome.boxBefore));
	const missed = outcomes.filter((outcome) => !outcome.correct);
	const accuracy = outcomes.length ? Math.round((remembered / outcomes.length) * 100) : null;
	const more = (finished?.remaining ?? 0) > 0;
	return <section className="animate-fade-slide-up space-y-6">
		<div className="space-y-2 text-center">
			<span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-success-subtle text-success"><MaterialIcon name={more ? 'flag' : 'task_alt'} filled size={34} /></span>
			<h2 className="text-3xl font-black text-foreground">{more ? 'Xong một vòng' : 'Hoàn thành hôm nay'}</h2>
			<p className="text-sm text-muted">{finished ? `Ngày mai có ${finished.tomorrowCount} từ đến hạn.` : 'Đang lưu kết quả…'}</p>
		</div>
		<dl className="grid grid-cols-3 gap-3">
			<div className="rounded-panel border border-border bg-surface p-4 text-center"><dt className="label-caps">Nhớ được</dt><dd className="mt-1 text-3xl font-black tabular-nums">{accuracy === null ? '–' : `${accuracy}%`}</dd><dd className="text-xs text-muted">{remembered}/{outcomes.length} từ, lần đầu</dd></div>
			<div className="rounded-panel border border-border bg-surface p-4 text-center"><dt className="label-caps">Từ mới</dt><dd className="mt-1 text-3xl font-black tabular-nums">{learned}</dd><dd className="text-xs text-muted">ôn lại ngày mai</dd></div>
			<div className="rounded-panel border border-border bg-surface p-4 text-center"><dt className="label-caps">Nhớ lâu</dt><dd className="mt-1 text-3xl font-black tabular-nums text-accent">+{promoted.length}</dd><dd className="text-xs text-muted">tổng {finished?.longTermCount ?? '…'}</dd></div>
		</dl>
		{promoted.length > 0 && <div className="rounded-panel border border-accent/30 bg-accent-subtle p-4"><p className="text-sm font-black text-accent">Vừa vào nhóm Nhớ lâu</p><p className="mt-1 text-sm text-foreground-secondary">{promoted.map((outcome) => outcome.item.bundle.word.lemma).join(' · ')}</p></div>}
		{missed.length > 0 && <div className="rounded-panel border border-border bg-surface p-4"><p className="text-sm font-black">Chưa nhớ ngay · sẽ ôn lại ngày mai</p><ul className="mt-2 divide-y divide-border/60">{missed.map((outcome) => <li key={outcome.item.senseId} className="flex items-baseline justify-between gap-3 py-2 text-sm"><span className="font-bold">{outcome.item.bundle.word.lemma}</span><span className="text-right text-muted">{outcome.item.bundle.sense.meaningVi}</span></li>)}</ul></div>}
		<div className="flex flex-col gap-2 sm:flex-row">
			{more && <Button size="lg" className="sm:flex-[2]" onClick={onMore}>Học tiếp · {finished?.remaining} từ</Button>}
			<Button size="lg" variant={more ? 'ghost' : 'primary'} className="sm:flex-1" onClick={onDone}>{more ? 'Để sau' : 'Về trang chủ'}</Button>
		</div>
	</section>;
}
