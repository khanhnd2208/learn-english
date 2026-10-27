'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';
import { QUIZ_KINDS, QUIZ_META, quizItemFor, type QuizKind } from '@/lib/english/quiz';
import { activityByKey, poolFromBundles, randomRng, type ActivityItem } from '@/lib/english/activities';
import { initialPracticeQueue, queueAfterAnswer, takePracticeStep, type PracticeStep } from '@/lib/english/practiceLoop';
import FocusFrame from '@/components/english/quiz/FocusFrame';
import QuestionView, { type QuestionFeedback } from '@/components/english/quiz/QuestionView';
import { answerLayout } from '@/lib/english/answerLayout';

export type PracticeKind = QuizKind | 'mix';

/** "Trộn cả 3" gives each word a fixed kind so a retried word keeps the same question type. */
function kindFor(wordIndex: number, chosen: PracticeKind): QuizKind {
	return chosen === 'mix' ? QUIZ_KINDS[wordIndex % QUIZ_KINDS.length]! : chosen;
}

/** Ungraded practice: graded in the browser, wrong words come back later, nothing is saved. */
export default function PracticeRunner({ detail, kind }: { detail: EnglishSetDetail; kind: PracticeKind }) {
	const source = useMemo(() => {
		const bundles = detail.words.map((word) => word.bundle);
		return { rng: randomRng(), bundles, pool: poolFromBundles(bundles) };
	}, [detail.words]);
	const freshQueue = () => initialPracticeQueue(detail.words.map((word) => word.bundle.sense.id));
	const [run, setRun] = useState(0);
	const [queue, setQueue] = useState<PracticeStep[]>(freshQueue);
	const [index, setIndex] = useState(0);
	const [firstCorrect, setFirstCorrect] = useState(0);
	const [seen, setSeen] = useState<string[]>([]);
	const [wrong, setWrong] = useState<string[]>([]);
	const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
	const [last, setLast] = useState<PracticeStep | null>(null);

	const taken = takePracticeStep(queue);
	const step = taken.current;
	const bundle = source.bundles.find((entry) => entry.sense.id === step?.senseId);
	const wordIndex = detail.words.findIndex((word) => word.bundle.sense.id === step?.senseId);
	// Rebuilt per step (index) so a retried word gets freshly shuffled choices.
	const item: ActivityItem | null = useMemo(
		() => (bundle ? quizItemFor(kindFor(wordIndex, kind), bundle, { pool: source.pool, rng: source.rng, allowSyntheticAudio: true }) : null),
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

	useEffect(() => {
		if (!feedback) return;
		if (feedback.correct) {
			const timer = setTimeout(advance, 1000);
			return () => clearTimeout(timer);
		}
		const onKey = (event: KeyboardEvent) => { if (event.key === 'Enter') { event.preventDefault(); advance(); } };
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
		setQueue(freshQueue());
		setIndex(0);
		setFirstCorrect(0);
		setSeen([]);
		setWrong([]);
		setFeedback(null);
		setLast(null);
		setRun((value) => value + 1);
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
				recordedAudioAvailable={Boolean(bundle && [bundle.word.audioPath, bundle.word.audioUkPath, bundle.word.audioUsPath].some((path) => path.trim()))}
			/>
			{feedback && <div role="status" className={`rounded-panel p-4 ${feedback.correct ? 'bg-success-subtle text-success' : 'border-2 border-error bg-surface'}`}>
				<p className="font-bold">{feedback.correct ? 'Chính xác!' : `Đáp án: ${feedback.expected}`}</p>
				{!feedback.correct && bundle && <>
					<p className="mt-1 text-sm"><span className="font-bold">{bundle.word.lemma}</span> {bundle.word.ipa && <span className="font-mono text-muted">{bundle.word.ipa}</span>} · {bundle.sense.meaningVi}</p>
					<p className="mt-1 text-xs text-muted">Từ này sẽ quay lại sau vài câu.</p>
					<button type="button" autoFocus onClick={advance} className="mt-3 min-h-11 rounded-control bg-accent px-4 font-bold text-accent-foreground">Tiếp tục ↵</button>
				</>}
			</div>}
		</div>}
		{step && !item && <div className="mode-card space-y-3 text-center">
			<p>Từ <span className="font-bold">{bundle?.word.lemma}</span> chưa đủ nội dung cho dạng {label}.</p>
			<button type="button" onClick={() => setQueue(taken.queue)} className="min-h-11 rounded-control bg-accent px-4 font-bold text-accent-foreground">Bỏ qua từ này</button>
		</div>}
		{!step && <section className="mode-card text-center">
			<h1 className="text-4xl">Hoàn thành luyện tập</h1>
			<p className="mt-3 text-lg"><span className="game-number text-3xl">{firstCorrect}/{seen.length}</span> đúng ngay lần đầu</p>
			{wrong.length > 0 && <div className="mt-5 text-left">
				<p className="label-caps">Từ cần chú ý</p>
				<ul className="mt-2 divide-y divide-border">{wrong.map((id) => <li key={id} className="py-2"><span className="font-bold">{lemmaOf(id)?.word.lemma}</span> <span className="text-sm text-muted">· {lemmaOf(id)?.sense.meaningVi}</span></li>)}</ul>
			</div>}
			<p className="mt-4 text-xs text-muted">Luyện tập không đổi lịch ôn. Muốn tính nhiệm vụ ngày, hãy làm bài kiểm tra.</p>
			<div className="mt-6 flex flex-wrap justify-center gap-3">
				<button type="button" onClick={restart} className="min-h-11 rounded-control bg-accent px-5 font-bold text-accent-foreground">Luyện lại</button>
				<Link href={`/sets/${detail.id}/test?type=${kind === 'mix' ? 'mcq' : kind}`} className="inline-flex min-h-11 items-center rounded-control border border-border px-5 font-bold">Làm bài kiểm tra {kind === 'mix' ? 'MCQ' : label}</Link>
			</div>
		</section>}
	</FocusFrame>;
}
