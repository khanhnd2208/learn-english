'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';
import { QUIZ_KINDS, QUIZ_META, quizItemFor, type QuizKind } from '@/lib/english/quiz';
import { activityByKey, poolFromBundles, mulberry32, type ActivityItem } from '@/lib/english/activities';
import { initialPracticeQueue, queueAfterAnswer, takePracticeStep, type PracticeStep } from '@/lib/english/practiceLoop';
import FocusFrame from '@/components/english/quiz/FocusFrame';
import AnswerFeedback from '@/components/english/session/AnswerFeedback';
import SessionSummary from '@/components/english/session/SessionSummary';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import QuestionView, { type QuestionFeedback } from '@/components/english/quiz/QuestionView';
import { answerLayout } from '@/lib/english/answerLayout';
import { cardExampleOf } from '@/lib/english/senseBundle';
import { useAudioPreload } from '@/lib/useAudioPreload';

export type PracticeKind = QuizKind | 'mix';

/** "Trộn cả 3" gives each word a fixed kind so a retried word keeps the same question type. */
function kindFor(wordIndex: number, chosen: PracticeKind): QuizKind {
	return chosen === 'mix' ? QUIZ_KINDS[wordIndex % QUIZ_KINDS.length]! : chosen;
}

/** Ungraded practice: graded in the browser, wrong words come back later, nothing is saved. */
/** `seed` comes from the server so SSR and hydration build the same queue and choices. */
export default function PracticeRunner({ detail, kind, seed }: { detail: EnglishSetDetail; kind: PracticeKind; seed: number }) {
	const source = useMemo(() => {
		const bundles = detail.words.map((word) => word.bundle);
		return { rng: mulberry32(seed), bundles, pool: poolFromBundles(bundles) };
	}, [detail.words, seed]);
	const freshQueue = (runOffset = 0) => {
		const queueRng = mulberry32((seed + Math.imul(runOffset + 1, 0x9e3779b1)) >>> 0);
		const eligible = detail.words
			.filter((word) => (kind === 'mix' ? QUIZ_KINDS : [kind]).some((key) => quizItemFor(key, word.bundle, { pool: source.pool, rng: mulberry32(seed), allowSyntheticAudio: true })))
			.map((word) => word.bundle.sense.id);
		return initialPracticeQueue(queueRng.shuffle(eligible));
	};
	useAudioPreload(source.bundles, { sentences: false });
	const [run, setRun] = useState(0);
	const [queue, setQueue] = useState<PracticeStep[]>(() => freshQueue(0));
	const [index, setIndex] = useState(0);
	const [firstCorrect, setFirstCorrect] = useState(0);
	const [seen, setSeen] = useState<string[]>([]);
	const [wrong, setWrong] = useState<string[]>([]);
	const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
	const [last, setLast] = useState<PracticeStep | null>(null);

	const taken = takePracticeStep(queue);
	const step = taken.current;
	const bundle = source.bundles.find((entry) => entry.sense.id === step?.senseId);
	const cardExample = bundle ? cardExampleOf(bundle.examples) : null;
	const wordIndex = detail.words.findIndex((word) => word.bundle.sense.id === step?.senseId);
	// Rebuilt per step (index) so a retried word gets freshly shuffled choices.
	const item: ActivityItem | null = useMemo(
		() => { if (!bundle) return null; const first = kindFor(wordIndex, kind); const keys = kind === 'mix' ? QUIZ_KINDS.map((_, offset) => QUIZ_KINDS[(wordIndex + offset) % QUIZ_KINDS.length]!) : [first]; return keys.map((key) => quizItemFor(key, bundle, { pool: source.pool, rng: source.rng, allowSyntheticAudio: true })).find(Boolean) ?? null; },
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[bundle, wordIndex, kind, source, index],
	);

	function advance() {
		if (!last) return;
		setQueue(queueAfterAnswer(taken.queue, last, feedback?.correct ?? false));
		setFeedback(null);
		setLast(null);
		setIndex((current) => current + 1);
	}

	// Right or wrong, the learner reads the result first and moves on with Enter or "Tiếp tục".
	useEffect(() => {
		if (!feedback) return;
		const onKey = (event: KeyboardEvent) => { if (event.key !== 'Enter' || event.isComposing || event.repeat || (event.target as HTMLElement | null)?.closest('button, a')) return; event.preventDefault(); advance(); };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function answer(value: string) {
		if (!step || !item || feedback) return;
		const correct = Boolean(activityByKey(item.activityKey)?.grade?.(item, value));
		const firstTime = !seen.includes(step.senseId);
		if (firstTime) setSeen((current) => [...current, step.senseId]);
		if (correct && firstTime) setFirstCorrect((current) => current + 1);
		if (!correct && !wrong.includes(step.senseId)) setWrong((current) => [...current, step.senseId]);
		setLast(step);
		setFeedback({ answer: value, correct, expected: item.answerKey });
	}

	function restart() {
		const nextRun = run + 1;
		setQueue(freshQueue(nextRun));
		setIndex(0);
		setFirstCorrect(0);
		setSeen([]);
		setWrong([]);
		setFeedback(null);
		setLast(null);
		setRun(nextRun);
	}

	const label = kind === 'mix' ? 'Trộn cả 3' : QUIZ_META[kind].label;
	const lemmaOf = (senseId: string) => source.bundles.find((entry) => entry.sense.id === senseId);

	return <FocusFrame title={detail.title} subtitle={`Luyện tập · ${label}`} progress={Math.min(seen.length, detail.words.length)} total={Math.max(1, detail.words.length)} dirty={Boolean(step)} exitHref={`/sets/${detail.id}`}>
		{step && item && <div key={`${run}-${index}`} className="space-y-4">
			<QuestionView
				item={{ position: index, activityKey: item.activityKey, prompt: item.prompt, layout: answerLayout(item.answerKey) }}
				onAnswer={answer}
				feedback={feedback}
				disabled={Boolean(feedback)}
				audioText={bundle?.word.lemma}
				recordedAudioAvailable={Boolean(bundle && bundle.word.audioPath.trim())}
			/>
			{feedback && <AnswerFeedback correct={feedback.correct}>
				{!feedback.correct && <p className="font-bold">Đáp án: {feedback.expected}</p>}
				{bundle && <><div className="flex items-center justify-between gap-2"><p className="text-sm"><span className="font-bold">{bundle.word.lemma}</span> {bundle.word.ipa && <span className="font-mono text-muted">{bundle.word.ipa}</span>} · {bundle.sense.meaningVi}</p><EnglishAudioButton compact senseId={bundle.sense.id} lemma={bundle.word.lemma} recordedAudioAvailable={Boolean(bundle.word.audioPath)} /></div>{cardExample && <p className="text-sm text-muted">{cardExample.english.replace('___', cardExample.target)}</p>}</>}
				{!feedback.correct && <p className="text-xs text-muted">Từ này sẽ quay lại sau vài câu.</p>}
				<button type="button" autoFocus onClick={advance} className="min-h-11 w-full rounded-control bg-accent px-4 font-bold text-accent-foreground">Tiếp tục ↵</button>
			</AnswerFeedback>}
		</div>}
		{step && !item && <div className="mode-card space-y-3 text-center">
			<p>Từ <span className="font-bold">{bundle?.word.lemma}</span> chưa đủ nội dung cho dạng {label}.</p>
			<button type="button" onClick={() => setQueue(taken.queue)} className="min-h-11 rounded-control bg-accent px-4 font-bold text-accent-foreground">Bỏ qua từ này</button>
		</div>}
		{!step && seen.length === 0 && <div className="mode-card text-center"><p>Bộ từ này chưa có câu cho dạng này</p><a href={`/sets/${detail.id}`} className="text-accent">Quay lại bộ từ</a></div>}
		{!step && seen.length > 0 && <SessionSummary title="Hoàn thành luyện tập" correct={firstCorrect} total={seen.length}>
			<p className="text-center text-sm text-muted">Đúng ngay lần đầu</p>
			{wrong.length > 0 && <div className="mt-5 text-left">
				<p className="label-caps">Từ cần chú ý</p>
				<ul className="mt-2 divide-y divide-border">{wrong.map((id) => <li key={id} className="py-2"><span className="font-bold">{lemmaOf(id)?.word.lemma}</span> <span className="text-sm text-muted">· {lemmaOf(id)?.sense.meaningVi}</span></li>)}</ul>
			</div>}
			
			<div className="mt-6 flex flex-wrap justify-center gap-3">
				<button type="button" onClick={restart} className="min-h-11 rounded-control bg-accent px-5 font-bold text-accent-foreground">Luyện lại</button>
			</div>
		</SessionSummary>}
	</FocusFrame>;
}
