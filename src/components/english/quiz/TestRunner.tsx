'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { englishPost } from '@/components/english/englishApi';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import FocusFrame from '@/components/english/quiz/FocusFrame';
import QuestionView, { type PublicQuestion } from '@/components/english/quiz/QuestionView';
import { EN_QUIZ_MAX_ITEMS } from '@/lib/english/constants';
import { QUIZ_META, type QuizKind } from '@/lib/english/quiz';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';

type Started = { attemptId: string; items: PublicQuestion[]; resumed: boolean; wordCount: number };
type Result = {
	passedCount: number;
	wordCount: number;
	items: Array<{ position: number; senseId: string; answer: string | null; answerKey: string; correct: boolean }>;
};
type Phase = 'intro' | 'loading' | 'run' | 'result' | 'error';

const message = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

/** Graded test: no feedback until submitted; every answer is saved so a reload resumes the attempt. */
export default function TestRunner({ detail, kind }: { detail: EnglishSetDetail; kind: QuizKind }) {
	const [phase, setPhase] = useState<Phase>('intro');
	const [started, setStarted] = useState<Started | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const [pos, setPos] = useState(0);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const [retry, setRetry] = useState(0);
	const shownAt = useRef(0);
	const storageKey = `quiz:${detail.id}:${kind}`;
	const label = QUIZ_META[kind].label;

	async function finish(attemptId: string) {
		setBusy(true);
		try {
			setResult(await englishPost<Result>('/api/quiz/finish', { attemptId }));
			setPhase('result');
			sessionStorage.removeItem(storageKey);
		} catch (cause) {
			setError(message(cause, 'Không nộp được bài'));
			setPhase('error');
		} finally {
			setBusy(false);
		}
	}

	async function start(restart = false) {
		setPhase('loading');
		setError('');
		try {
			const data = await englishPost<Started>('/api/quiz/start', { setId: detail.id, kind, restart });
			setStarted(data);
			sessionStorage.setItem(storageKey, data.attemptId);
			const next = data.items.findIndex((item) => item.answer === null);
			if (next < 0) {
				await finish(data.attemptId);
				return;
			}
			setPos(next);
			shownAt.current = Date.now();
			setPhase('run');
		} catch (cause) {
			setError(message(cause, 'Không mở được bài kiểm tra'));
			setPhase('error');
		}
	}

	// Resume an unfinished attempt after a reload in the same tab.
	useEffect(() => {
		if (sessionStorage.getItem(storageKey)) queueMicrotask(() => void start());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function answer(value: string) {
		if (!started || busy) return;
		setBusy(true);
		setError('');
		try {
			await englishPost('/api/quiz/answer', { attemptId: started.attemptId, position: pos, answer: value, responseMs: Date.now() - shownAt.current });
			const items = started.items.map((item) => (item.position === pos ? { ...item, answer: value } : item));
			setStarted({ ...started, items });
			const next = items.findIndex((item) => item.answer === null);
			if (next < 0) {
				await finish(started.attemptId);
			} else {
				setPos(next);
				shownAt.current = Date.now();
			}
		} catch (cause) {
			setError(message(cause, 'Không lưu được câu trả lời. Hãy thử lại.'));
			setRetry((value) => value + 1);
		} finally {
			setBusy(false);
		}
	}

	const answered = started?.items.filter((item) => item.answer !== null).length ?? 0;
	const lemmaOf = (senseId: string) => detail.words.find((word) => word.bundle.sense.id === senseId)?.bundle.word.lemma ?? '';
	const missed = result?.items.filter((item) => !item.correct) ?? [];

	return <FocusFrame title={detail.title} subtitle={`Kiểm tra · ${label}`} progress={phase === 'result' ? started?.wordCount ?? 0 : answered} total={started?.wordCount ?? EN_QUIZ_MAX_ITEMS} dirty={phase === 'run'} exitHref={`/sets/${detail.id}`}>
		{phase === 'loading' && <div className="h-64 animate-pulse rounded-panel bg-surface-container" aria-busy="true" aria-label="Đang tải bài kiểm tra" />}

		{phase === 'intro' && <section className="mode-card text-center">
			<h1 className="text-4xl">Kiểm tra {label}</h1>
			<p className="mt-3">Tối đa {EN_QUIZ_MAX_ITEMS} câu · khoảng 5 phút · {QUIZ_META[kind].hint.toLowerCase()}</p>
			<p className="mt-2 text-sm text-muted">Đáp án chỉ hiện sau khi nộp bài. Câu bỏ qua tính là sai. Tải lại trang vẫn làm tiếp được.</p>
			<button type="button" autoFocus onClick={() => void start()} className="mt-6 min-h-11 rounded-control bg-accent px-6 font-bold text-accent-foreground">Bắt đầu</button>
		</section>}

		{phase === 'error' && <section className="mode-card space-y-3 text-center">
			<p role="alert" className="text-error">{error}</p>
			<button type="button" onClick={() => void (started && started.items.every((item) => item.answer !== null) ? finish(started.attemptId) : start())} className="min-h-11 rounded-control border border-border px-4 font-bold">Thử lại</button>
		</section>}

		{phase === 'run' && started?.items[pos] && <div className="space-y-4">
			<p className="text-sm text-muted">Câu {answered + 1}/{started.wordCount}</p>
			<QuestionView key={`${pos}-${retry}`} item={started.items[pos]} onAnswer={(value) => void answer(value)} disabled={busy} />
			<div className="flex justify-end">
				<button type="button" disabled={busy} onClick={() => void answer('')} className="min-h-11 rounded-control border border-border px-4 font-bold">Bỏ qua</button>
			</div>
			{error && <p role="alert" className="text-error">{error}</p>}
		</div>}

		{phase === 'result' && result && <section className="mode-card text-center">
			<p className="label-caps">Kết quả</p>
			<p className="game-number mt-2 text-6xl">{result.passedCount}/{result.wordCount}</p>
			<p className="mt-2 font-bold text-success">✓ Đã tính nhiệm vụ Kiểm tra {label} hôm nay</p>
			{missed.length > 0 ? <>
				<h2 className="mt-7 text-left text-2xl">Câu cần xem lại · {missed.length}</h2>
				<ul className="mt-3 space-y-2 text-left">{missed.map((item) => <li key={item.position} className="flex items-center gap-3 rounded-control border border-border p-3">
					<div className="min-w-0 flex-1">
						<p className="font-bold">{lemmaOf(item.senseId)}</p>
						<p className="text-sm">Bạn trả lời: <s className="text-error">{item.answer || 'Bỏ qua'}</s> · Đáp án: <span className="font-bold text-success">{item.answerKey}</span></p>
					</div>
					<EnglishAudioButton compact senseId={item.senseId} lemma={lemmaOf(item.senseId)} recordedAudioAvailable />
				</li>)}</ul>
			</> : <p className="mt-6 text-lg">Không sai câu nào. Tuyệt vời!</p>}
			<div className="mt-6 flex flex-wrap justify-center gap-3">
				<button type="button" onClick={() => void start(true)} className="min-h-11 rounded-control bg-accent px-5 font-bold text-accent-foreground">Làm lại</button>
				<Link href={`/sets/${detail.id}`} className="inline-flex min-h-11 items-center rounded-control border border-border px-5 font-bold">Về bộ từ</Link>
				<Link href="/" className="inline-flex min-h-11 items-center rounded-control border border-border px-5 font-bold">Tổng quan</Link>
			</div>
		</section>}
	</FocusFrame>;
}
