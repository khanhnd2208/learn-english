'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmExitDialog from '@/components/english/ConfirmExitDialog';
import EnglishWordCard from '@/components/english/EnglishWordCard';
import { useRewardToasts } from '@/components/english/goals/useRewardToasts';
import { englishPost } from '@/components/english/englishApi';
import QuestionView, { type PublicQuestion, type QuestionFeedback } from '@/components/english/quiz/QuestionView';
import { EN_GUIDED_CHUNK_SIZE } from '@/lib/english/constants';
import type { SenseBundle } from '@/lib/english/senseBundle';
import type { GoalReward } from '@/services/english/enGoalService';

export type GuidedPublicQuestion = PublicQuestion & {
	id: string;
	senseId: string;
	answer: string | null;
	correct: boolean | null;
	expected: string | null;
};

export type GuidedSession = {
	id: string;
	phase: 'study' | 'quiz' | 'retry' | 'summary' | 'finished';
	chunkNumber: number;
	studyPosition: number;
	questionPosition: number;
	selectedSetIds: string[];
	poolSize: number;
	remainingCount: number;
	words: SenseBundle[];
	questions: GuidedPublicQuestion[];
	mainResults: Array<{ senseId: string; correct: boolean }>;
	retryCompleted: boolean;
	endedAt: string | null;
};

type AnswerResult = { correct: boolean; expected: string; session: GuidedSession; reward?: GoalReward | null };

export default function GuidedReviewSession({ initial, onClose }: { initial: GuidedSession; onClose: (finished: boolean) => void }) {
	const [session, setSession] = useState(initial);
	const [viewedWord, setViewedWord] = useState(Math.min(initial.studyPosition, Math.max(0, initial.words.length - 1)));
	const [shownQuestion, setShownQuestion] = useState<GuidedPublicQuestion | null>(initial.questions.find((question) => question.answer === null) ?? null);
	const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
	const [pendingSession, setPendingSession] = useState<GuidedSession | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [confirmExit, setConfirmExit] = useState(false);
	const { sessionXp, xpPop, reward } = useRewardToasts();
	const shownAt = useRef(0);

	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		shownAt.current = Date.now();
		return () => { document.body.style.overflow = previous; };
	}, []);

	const wrongIds = useMemo(() => new Set(session.mainResults.filter((result) => !result.correct).map((result) => result.senseId)), [session.mainResults]);
	const correctCount = session.mainResults.filter((result) => result.correct).length;

	async function saveStudy(position: number) {
		if (busy) return;
		setBusy(true);
		setError('');
		try {
			const next = await englishPost<GuidedSession>('/api/review', { action: 'study', sessionId: session.id, position });
			setSession(next);
			if (next.phase !== 'study') {
				setShownQuestion(next.questions.find((question) => question.answer === null) ?? null);
				shownAt.current = Date.now();
			} else setViewedWord(Math.min(position, next.words.length - 1));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không lưu được tiến độ.');
		} finally {
			setBusy(false);
		}
	}

	async function answer(value: string) {
		if (!shownQuestion || busy) return;
		setBusy(true);
		setError('');
		try {
			const result = await englishPost<AnswerResult>('/api/review', { action: 'answer', sessionId: session.id, questionId: shownQuestion.id, answer: value, responseMs: shownAt.current ? Date.now() - shownAt.current : 0 });
			setFeedback({ answer: value, correct: result.correct, expected: result.expected });
			reward(result.reward);
			setPendingSession(result.session);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không lưu được câu trả lời.');
		} finally {
			setBusy(false);
		}
	}

	function continueAfterFeedback() {
		if (!pendingSession) return;
		const next = pendingSession;
		setSession(next);
		setFeedback(null);
		setPendingSession(null);
		setShownQuestion(next.questions.find((question) => question.answer === null) ?? null);
		shownAt.current = Date.now();
	}

	async function action(kind: 'retry' | 'next', restart = false) {
		if (busy) return;
		setBusy(true);
		setError('');
		try {
			const next = await englishPost<GuidedSession>('/api/review', { action: kind, sessionId: session.id, ...(kind === 'next' ? { restart } : {}) });
			setSession(next);
			setViewedWord(0);
			setShownQuestion(next.questions.find((question) => question.answer === null) ?? null);
			shownAt.current = Date.now();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không thể tiếp tục.');
		} finally {
			setBusy(false);
		}
	}

	async function finish() {
		if (busy) return;
		setBusy(true);
		setError('');
		try {
			await englishPost('/api/review', { action: 'finish', sessionId: session.id });
			onClose(true);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không kết thúc được phiên.');
			setBusy(false);
		}
	}

	/** Leaving keeps the session open on the server, so the overview can offer "Tiếp tục". */
	function leave() {
		if (session.phase === 'summary') { void finish(); return; }
		setConfirmExit(true);
	}

	const word = session.words[viewedWord];
	const questionWord = shownQuestion ? session.words.find((entry) => entry.sense.id === shownQuestion.senseId) : null;
	const covered = session.poolSize - session.remainingCount;
	const lapChunks = Math.max(1, Math.ceil(session.poolSize / EN_GUIDED_CHUNK_SIZE));
	const lapChunk = Math.min(lapChunks, Math.max(1, Math.ceil(covered / EN_GUIDED_CHUNK_SIZE)));
	const stepTotal = session.phase === 'study' ? session.words.length : session.questions.length;
	const stepDone = session.phase === 'summary' ? stepTotal : session.phase === 'study' ? viewedWord : session.questionPosition;
	const stepLabel = session.phase === 'study' ? `Xem thẻ ${viewedWord + 1}/${session.words.length}` : session.phase === 'summary' ? 'Kết quả chặng' : `${session.phase === 'retry' ? 'Luyện lại từ sai' : 'Luyện'} · câu ${Math.min(session.questionPosition + 1, session.questions.length)}/${session.questions.length}`;

	return <div role="dialog" aria-modal="true" aria-label="Học thêm" className="fixed inset-0 z-overlay overflow-y-auto bg-background">
		<div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-7">
			<header className="space-y-2 border-b border-border pb-3">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-accent">Chặng {lapChunk}/{lapChunks} · đã đi {covered}/{session.poolSize} từ</p><p className="font-bold">{stepLabel}</p></div>
					<span className="relative flex shrink-0 items-center gap-2">{xpPop && <span key={xpPop.id} aria-hidden="true" className="animate-xp-pop xp-chip pointer-events-none absolute -top-1 right-full mr-2">+{xpPop.xp} XP</span>}<button type="button" disabled={busy} onClick={leave} className="min-h-11 rounded-control border border-border px-4 font-bold disabled:opacity-50">Thoát</button></span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-accent-subtle" role="progressbar" aria-label="Tiến độ chặng" aria-valuemin={0} aria-valuemax={stepTotal} aria-valuenow={stepDone}><div className="h-full rounded-full bg-accent transition-all duration-500 motion-reduce:transition-none" style={{ width: `${stepTotal ? (stepDone / stepTotal) * 100 : 0}%` }} /></div>
			</header>

			<main className="flex flex-1 flex-col justify-center py-5">
				{session.phase === 'study' && word && <div className="mode-card mx-auto w-full max-w-2xl p-5 sm:p-8">
					<EnglishWordCard key={word.sense.id} bundle={word} />
					<div className="mt-7 flex justify-between gap-3">
						<button type="button" disabled={viewedWord === 0 || busy} onClick={() => setViewedWord((current) => current - 1)} className="min-h-11 rounded-control border border-border px-4 font-bold disabled:opacity-40">← Quay lại</button>
						<button type="button" disabled={busy} onClick={() => void saveStudy(viewedWord + 1)} className="min-h-11 rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">{viewedWord + 1 >= session.words.length ? 'Bắt đầu luyện →' : 'Từ tiếp theo →'}</button>
					</div>
				</div>}

				{['quiz', 'retry'].includes(session.phase) && shownQuestion && <div className="mx-auto w-full max-w-2xl space-y-4">
					<QuestionView key={shownQuestion.id} item={shownQuestion} disabled={busy} feedback={feedback} onAnswer={(value) => void answer(value)} audioText={questionWord?.word.lemma} recordedAudioAvailable={Boolean(questionWord && (questionWord.word.audioPath || questionWord.word.audioUkPath || questionWord.word.audioUsPath))} />
					{feedback ? <div aria-live="polite" className={`rounded-panel border p-4 ${feedback.correct ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5'}`}>
						<p className="text-lg font-bold">{feedback.correct ? '✓ Chính xác' : `Đáp án: ${feedback.expected}`}</p>
						{questionWord && <><p className="mt-1">{questionWord.sense.meaningVi}</p>{questionWord.examples[0] && <p className="mt-2 text-sm text-muted">{questionWord.examples[0].english}<br />{questionWord.examples[0].meaningVi}</p>}</>}
						<button type="button" autoFocus onClick={continueAfterFeedback} className="mt-4 min-h-11 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground">Tiếp tục →</button>
					</div> : <button type="button" disabled={busy} onClick={() => void answer('')} className="min-h-11 w-full rounded-control border border-border px-4 font-bold">Chưa nhớ</button>}
				</div>}

				{session.phase === 'summary' && <section className="mode-card mx-auto w-full max-w-2xl p-6 text-center sm:p-8">
					<p className="text-sm font-bold uppercase tracking-wide text-accent">Hoàn thành chặng {session.chunkNumber}</p>
					<h2 className="mt-2 text-4xl">Đúng lần đầu {correctCount}/{session.mainResults.length}</h2>
					<p className="mt-2 text-sm text-muted">Đã đi {covered}/{session.poolSize} từ trong các bộ đã chọn{sessionXp > 0 ? ` · +${sessionXp} XP phiên này` : ''}</p>
					{wrongIds.size > 0 ? <div className="mt-5 rounded-panel bg-surface-secondary p-4 text-left"><p className="font-bold">Từ cần luyện thêm</p><p className="mt-1 text-sm text-muted">{session.words.filter((entry) => wrongIds.has(entry.sense.id)).map((entry) => entry.word.lemma).join(' · ')}</p></div> : <p className="mt-4 font-bold text-success">Bạn nhớ đúng tất cả từ trong chặng này.</p>}
					<div className="mt-6 grid gap-3 sm:grid-cols-2">
						{wrongIds.size > 0 && !session.retryCompleted && <button type="button" disabled={busy} onClick={() => void action('retry')} className="min-h-12 rounded-control border border-accent px-5 font-bold text-accent">Luyện lại từ sai</button>}
						{session.remainingCount > 0 ? <button type="button" disabled={busy} onClick={() => void action('next')} className="min-h-12 rounded-control bg-accent px-5 font-bold text-accent-foreground">Học {Math.min(EN_GUIDED_CHUNK_SIZE, session.remainingCount)} từ tiếp →</button> : <button type="button" disabled={busy} onClick={() => void action('next', true)} className="min-h-12 rounded-control border border-border px-5 font-bold">Ôn lại một vòng</button>}
						<button type="button" disabled={busy} onClick={() => void finish()} className="min-h-12 rounded-control border border-border px-5 font-bold sm:col-span-2">Kết thúc phiên</button>
					</div>
				</section>}
			</main>
			<ConfirmExitDialog open={confirmExit} title="Tạm dừng Học thêm?" description="Câu đã trả lời được giữ. Bạn có thể bấm “Tiếp tục” ở trang Học thêm để học tiếp đúng chỗ này." leaveLabel="Tạm dừng" onStay={() => setConfirmExit(false)} onLeave={() => onClose(false)} />
			{error && <div role="alert" className="sticky bottom-3 rounded-panel border border-error/40 bg-surface p-3 text-sm text-error">{error} <button type="button" onClick={() => setError('')} className="ml-2 font-bold underline">Đóng</button></div>}
		</div>
	</div>;
}
