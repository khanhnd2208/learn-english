'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmExitDialog from '@/components/english/ConfirmExitDialog';
import SessionHeader from '@/components/english/session/SessionHeader';
import SessionSummary from '@/components/english/session/SessionSummary';
import SessionFooter, { ResultLine } from '@/components/english/session/SessionFooter';
import EnglishWordCard from '@/components/english/EnglishWordCard';
import { useRewardToasts } from '@/components/english/goals/useRewardToasts';
import { englishPost } from '@/components/english/englishApi';
import QuestionView, { type PublicQuestion, type QuestionFeedback } from '@/components/english/quiz/QuestionView';
import { EN_GUIDED_CHUNK_SIZE } from '@/lib/english/constants';
import type { SenseBundle } from '@/lib/english/senseBundle';
import { useAudioPreload } from '@/lib/useAudioPreload';
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

export default function GuidedReviewSession({ initial, onClose }: { initial: GuidedSession; onClose: () => void }) {
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
			onClose();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không kết thúc được phiên.');
			setBusy(false);
		}
	}

	function leave() {
		if (session.phase === 'summary') { void finish(); return; }
		setConfirmExit(true);
	}

	/** Leaving mid-chunk ends the session; the next run starts fresh with 5 new random words. */
	function quit() {
		void englishPost('/api/review', { action: 'abandon', sessionId: session.id }).catch(() => undefined);
		onClose();
	}

	useAudioPreload(session.words);
	const word = session.words[viewedWord];
	const questionWord = shownQuestion ? session.words.find((entry) => entry.sense.id === shownQuestion.senseId) : null;
	const covered = session.poolSize - session.remainingCount;
	const lapChunks = Math.max(1, Math.ceil(session.poolSize / EN_GUIDED_CHUNK_SIZE));
	const lapChunk = Math.min(lapChunks, Math.max(1, Math.ceil(covered / EN_GUIDED_CHUNK_SIZE)));
	const stepTotal = session.phase === 'study' ? session.words.length : session.questions.length;
	const stepDone = session.phase === 'summary' ? stepTotal : session.phase === 'study' ? viewedWord : session.questionPosition;
	const stepLabel = session.phase === 'study' ? `Xem thẻ ${viewedWord + 1}/${session.words.length}` : session.phase === 'summary' ? 'Kết quả chặng' : `${session.phase === 'retry' ? 'Luyện lại từ sai' : 'Luyện'} · câu ${Math.min(session.questionPosition + 1, session.questions.length)}/${session.questions.length}`;

	const inQuiz = ['quiz', 'retry'].includes(session.phase) && Boolean(shownQuestion);

	return <div role="dialog" aria-modal="true" aria-label="Ôn theo bộ" className="fixed inset-0 z-overlay flex flex-col bg-background">
		<SessionHeader label="Ôn theo bộ" progress={stepDone} total={stepTotal} onExit={leave} busy={busy} xpPop={xpPop} />
		{/* Keyed per card/question so a long card never leaves the next one scrolled halfway down. */}
		<div key={`${session.phase}-${viewedWord}-${shownQuestion?.id ?? ''}`} className="min-h-0 flex-1 overflow-y-auto">
			<div className="mx-auto max-w-2xl px-4 py-3 sm:py-5">
				<div className="mb-3 flex items-baseline justify-between gap-3"><p className="font-bold">{stepLabel}</p><p className="shrink-0 text-xs font-bold uppercase tracking-wide text-accent">Chặng {lapChunk}/{lapChunks} · {covered}/{session.poolSize} từ</p></div>

				{session.phase === 'study' && word && <div key={word.sense.id} className="mode-card p-4 sm:p-6"><EnglishWordCard bundle={word} /></div>}

				{inQuiz && shownQuestion && <QuestionView key={shownQuestion.id} item={shownQuestion} disabled={busy} feedback={feedback} onAnswer={(value) => void answer(value)} audioText={questionWord?.word.lemma} recordedAudioAvailable={Boolean(questionWord && (questionWord.word.audioPath))} />}

				{session.phase === 'summary' && <SessionSummary title={`Hoàn thành chặng ${session.chunkNumber}`} correct={correctCount} total={session.mainResults.length} xp={sessionXp}>
					<p className="text-center text-sm text-muted">Đã đi {covered}/{session.poolSize} từ trong các bộ đã chọn.</p>
					{wrongIds.size > 0 ? <div className="mt-5 rounded-panel bg-surface-secondary p-4 text-left"><p className="font-bold">Từ cần luyện thêm</p><p className="mt-1 text-sm text-muted">{session.words.filter((entry) => wrongIds.has(entry.sense.id)).map((entry) => entry.word.lemma).join(' · ')}</p></div> : <p className="mt-4 font-bold text-success">Bạn nhớ đúng tất cả từ trong chặng này.</p>}
					<div className="mt-6 grid gap-3 sm:grid-cols-2">
						{wrongIds.size > 0 && !session.retryCompleted && <button type="button" disabled={busy} onClick={() => void action('retry')} className="min-h-12 rounded-control border border-accent px-5 font-bold text-accent">Luyện lại từ sai</button>}
						{session.remainingCount > 0 ? <button type="button" disabled={busy} onClick={() => void action('next')} className="min-h-12 rounded-control bg-accent px-5 font-bold text-accent-foreground">Học {Math.min(EN_GUIDED_CHUNK_SIZE, session.remainingCount)} từ tiếp →</button> : <button type="button" disabled={busy} onClick={() => void action('next', true)} className="min-h-12 rounded-control border border-border px-5 font-bold">Ôn lại một vòng</button>}
						<button type="button" disabled={busy} onClick={() => void finish()} className="min-h-12 rounded-control border border-border px-5 font-bold sm:col-span-2">Kết thúc phiên</button>
					</div>
				</SessionSummary>}
				{error && <div role="alert" className="mt-3 rounded-panel border border-error/40 bg-surface p-3 text-sm text-error">{error} <button type="button" onClick={() => setError('')} className="ml-2 font-bold underline">Đóng</button></div>}
			</div>
		</div>

		{session.phase === 'study' && word && <SessionFooter>
			<div className="flex gap-3">
				<button type="button" disabled={viewedWord === 0 || busy} onClick={() => setViewedWord((current) => current - 1)} className="min-h-12 flex-1 whitespace-nowrap rounded-control border border-border px-3 font-bold disabled:opacity-40 sm:px-4">← Quay lại</button>
				<button type="button" disabled={busy} onClick={() => void saveStudy(viewedWord + 1)} className="min-h-12 flex-[2] whitespace-nowrap rounded-control bg-accent px-4 font-bold sm:px-5 text-accent-foreground disabled:opacity-50">{viewedWord + 1 >= session.words.length ? 'Bắt đầu luyện →' : 'Từ tiếp theo →'}</button>
			</div>
		</SessionFooter>}

		{/* Quiz feedback is only right/wrong and the right answer: the word was just studied on its card. */}
		{inQuiz && <SessionFooter tone={feedback ? (feedback.correct ? 'correct' : 'wrong') : undefined}>
			<ResultLine correct={feedback?.correct} expected={feedback?.expected} idle={shownQuestion?.activityKey === 'listen_type' ? 'Gõ từ bạn nghe được, hoặc bấm “Chưa nhớ”.' : 'Chọn đáp án, hoặc bấm “Chưa nhớ” nếu bạn quên.'} />
			{feedback
				? <button key="continue" type="button" autoFocus onClick={continueAfterFeedback} className="min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground">Tiếp tục →</button>
				: <button key="skip" type="button" disabled={busy} onClick={() => void answer('')} className="min-h-12 w-full rounded-control border border-border bg-surface px-4 font-bold disabled:opacity-50">Chưa nhớ</button>}
		</SessionFooter>}
		<ConfirmExitDialog open={confirmExit} title="Thoát Ôn theo bộ?" description="Chặng này sẽ không được lưu. Lần sau bạn bắt đầu lại với 5 từ mới." leaveLabel="Thoát" onStay={() => setConfirmExit(false)} onLeave={quit} />
	</div>;
}
