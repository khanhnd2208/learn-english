'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';
import { type QuizKind, quizItemFor, QUIZ_META } from '@/lib/english/quiz';
import { activityByKey, poolFromBundles, randomRng, type ActivityItem } from '@/lib/english/activities';
import { initialPracticeQueue, queueAfterAnswer, takePracticeStep, type PracticeStep } from '@/lib/english/practiceLoop';
import FocusFrame from './FocusFrame';
import QuestionView from './QuestionView';

type Kind = QuizKind | 'mix';
function kindFor(index: number, chosen: Kind): QuizKind { return chosen === 'mix' ? (['mcq', 'fill', 'listen'] as const)[index % 3]! : chosen; }
export default function PracticeRunner({ detail, kind }: { detail: EnglishSetDetail; kind: Kind }) {
 const source = useMemo(() => { const rng = randomRng(); const bundles = detail.words.map((word) => word.bundle); const pool = poolFromBundles(bundles); return { rng, bundles, pool }; }, [detail.words]);
 const [run, setRun] = useState(0);
 const [queue, setQueue] = useState<PracticeStep[]>(() => initialPracticeQueue(detail.words.map((word) => word.bundle.sense.id), 'meaning_choice'));
 const [index, setIndex] = useState(0);
 const [firstCorrect, setFirstCorrect] = useState(0);
 const [seen, setSeen] = useState<string[]>([]);
 const [wrong, setWrong] = useState<string[]>([]);
 const [feedback, setFeedback] = useState<{ answer: string; correct: boolean; expected: string } | null>(null);
 const [last, setLast] = useState<{ step: PracticeStep; item: ActivityItem } | null>(null);
 const taken = takePracticeStep(queue);
 const step = taken.current;
 const bundle = source.bundles.find((entry) => entry.sense.id === step?.senseId);
 const wordIndex = detail.words.findIndex((word) => word.bundle.sense.id === step?.senseId);
 const item = useMemo(() => bundle ? quizItemFor(kindFor(wordIndex, kind), bundle, { pool: source.pool, rng: source.rng, allowSyntheticAudio: true }) : null, [bundle, wordIndex, kind, source]);
 useEffect(() => { if (!feedback?.correct) return; const timer = setTimeout(() => advance(), 1000); return () => clearTimeout(timer); });
 useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Enter' && feedback && !feedback.correct) advance(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });
 function answer(value: string) { if (!step || !item || feedback) return; const correct = Boolean(activityByKey(item.activityKey)?.grade?.(item, value)); const nextSeen = seen.includes(step.senseId) ? seen : [...seen, step.senseId]; setSeen(nextSeen); if (correct && !seen.includes(step.senseId)) setFirstCorrect((current) => current + 1); if (!correct && !wrong.includes(step.senseId)) setWrong((current) => [...current, step.senseId]); setLast({ step, item }); setFeedback({ answer: value, correct, expected: item.answerKey }); }
 function advance() { if (!last) return; setQueue(queueAfterAnswer(takePracticeStep(queue).queue, last.step, feedback?.correct ?? false, false)); setFeedback(null); setLast(null); setIndex((current) => current + 1); }
 function restart() { setQueue(initialPracticeQueue(detail.words.map((word) => word.bundle.sense.id), 'meaning_choice')); setIndex(0); setFirstCorrect(0); setSeen([]); setWrong([]); setFeedback(null); setLast(null); setRun((value) => value + 1); }
 if (!detail.enrolled) return <p className="p-6">Đăng ký bộ từ trước khi luyện tập.</p>;
 return <FocusFrame title={detail.title} subtitle={`Luyện tập · ${kind === 'mix' ? 'Trộn cả 3' : QUIZ_META[kind].label}`} progress={Math.min(seen.length, detail.words.length)} total={Math.max(1, detail.words.length)} dirty={Boolean(step)} exitHref={`/sets/${detail.id}`}>{step && item ? <div key={`${run}-${index}`} className="space-y-4"><QuestionView item={{ position: index, activityKey: item.activityKey, prompt: item.prompt }} onAnswer={answer} feedback={feedback} disabled={Boolean(feedback)} />{feedback && <div className={`rounded-panel p-4 ${feedback.correct ? 'bg-success-subtle text-success' : 'border border-error bg-surface'}`}><strong>{feedback.correct ? 'Chính xác!' : `Chưa đúng · ${feedback.expected}`}</strong>{!feedback.correct && <><p className="mt-1 text-sm">{bundle?.word.lemma} · {bundle?.sense.meaningVi}</p><button type="button" onClick={advance} className="mt-3 min-h-11 rounded-control bg-accent px-4 font-bold text-accent-foreground">Tiếp tục ↵</button></>}</div>}</div> : step && !item ? <button type="button" onClick={() => setQueue(taken.queue)} className="min-h-11 rounded-control bg-accent px-4 text-accent-foreground">Bỏ qua từ thiếu dữ liệu</button> : <section className="rounded-panel border border-border bg-surface p-6 text-center"><h1 className="text-4xl">Hoàn thành luyện tập</h1><p className="mt-3 text-lg">{firstCorrect}/{seen.length} đúng ngay lần đầu</p>{wrong.length > 0 && <p className="mt-3 text-sm text-muted">Từ cần luyện lại: {wrong.map((id) => source.bundles.find((bundle) => bundle.sense.id === id)?.word.lemma).join(', ')}</p>}<div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={restart} className="min-h-11 rounded-control bg-accent px-5 font-bold text-accent-foreground">Luyện lại</button><Link href={`/sets/${detail.id}/test?type=${kind === 'mix' ? 'mcq' : kind}`} className="min-h-11 content-center rounded-control border border-border px-5 font-bold">Làm bài kiểm tra dạng này</Link></div></section>}</FocusFrame>;
}
