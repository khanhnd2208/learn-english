'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Sheet from '@/components/ui/Sheet';
import ProgressBar from '@/components/ui/ProgressBar';
import { splitBlank } from '@/lib/english/text';
import Link from 'next/link';
import TestResultView from '@/components/english/tests/TestResultView';
import { EN_TEST_PASS_PERCENT } from '@/lib/english/constants';
import type { TestResult, PublicTestAttempt, getTestPaperForLearner } from '@/services/english/enTestService';

type Initial = Awaited<ReturnType<typeof getTestPaperForLearner>>;
type Stage = 'intro' | 'questions' | 'result';

export default function TestRunner({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('intro');
  const [attempt, setAttempt] = useState<PublicTestAttempt | null>(initial.attempt);
  const [position, setPosition] = useState(initial.attempt?.position ?? 0);
  const [persistedPosition, setPersistedPosition] = useState(initial.attempt?.position ?? 0);
  const [answers, setAnswers] = useState<(string | null)[]>(initial.attempt?.items.map((item) => item.answer) ?? []);
  const [committed, setCommitted] = useState<(string | null)[]>(initial.attempt?.items.map((item) => item.answer) ?? []);
  const [result, setResult] = useState<TestResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const subjectUrl = `/tests/subjects/${initial.paper.subjectId}`;
  async function api(action: object): Promise<unknown> {
    const response = await fetch(`/api/tests/papers/${initial.paper.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
    const body = await response.json() as { ok?: boolean; error?: string; data?: unknown };
    if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không lưu được câu trả lời. Thử lại nhé.');
    return body.data;
  }
  async function start() {
    setPending(true); setError('');
    try {
      const next = await api({ action: 'start' }) as PublicTestAttempt;
      setAttempt(next); setPosition(next.position); setPersistedPosition(next.position); setAnswers(next.items.map((item) => item.answer)); setCommitted(next.items.map((item) => item.answer)); setResult(null); setStage('questions');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Yêu cầu không hợp lệ'); }
    finally { setPending(false); }
  }
  async function saveAnswer(index: number, value: string | null): Promise<boolean> {
    if (!attempt || value === committed[index]) return true;
    setPending(true); setError('');
    try {
      await api({ action: 'answer', attemptId: attempt.id, position: index, answer: value ?? '' });
      setCommitted((old) => { const next = [...old]; next[index] = value; return next; });
      setPersistedPosition(index);
      return true;
    } catch { setError('Không lưu được câu trả lời. Thử lại nhé.'); return false; }
    finally { setPending(false); }
  }
  async function saveCurrent(): Promise<boolean> { return saveAnswer(position, answers[position] ?? null); }
  async function persistPosition(index: number): Promise<boolean> {
    if (!attempt || index === persistedPosition) return true;
    setPending(true); setError('');
    try {
      await api({ action: 'answer', attemptId: attempt.id, position: index, answer: answers[index] ?? '' });
      setPersistedPosition(index);
      return true;
    } catch { setError('Không lưu được câu trả lời. Thử lại nhé.'); return false; }
    finally { setPending(false); }
  }
  async function goTo(next: number) {
    if (!attempt || pending || next < 0 || next >= attempt.total) return;
    if (!await saveCurrent()) return;
    if (!await persistPosition(next)) return;
    setPosition(next); setSheetOpen(false);
  }
  async function choose(index: number) {
    if (!attempt || pending) return;
    const value = String(index);
    setAnswers((old) => { const next = [...old]; next[position] = value; return next; });
    await saveAnswer(position, value);
  }
  async function submit() {
    if (!attempt || pending || !await saveCurrent()) return;
    if (answers.filter((answer) => !answer?.trim()).length) { setConfirmFinish(true); return; }
    await finish();
  }
  async function finish() {
    if (!attempt) return;
    setConfirmFinish(false); setPending(true); setError('');
    try { setResult(await api({ action: 'finish', attemptId: attempt.id }) as TestResult); setStage('result'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Yêu cầu không hợp lệ'); }
    finally { setPending(false); }
  }
  async function exit() { if (await saveCurrent() && await persistPosition(position)) setConfirmExit(true); }
  const item = attempt?.items[position];
  const blank = item?.type === 'fill' ? splitBlank(item.prompt) : null;
  const answered = answers.filter((answer) => Boolean(answer?.trim())).length;
  return <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-8">
    {stage === 'intro' && <div className="mx-auto my-auto w-full max-w-xl space-y-5 rounded-card border border-border bg-surface p-6"><p className="text-sm font-bold text-accent">{initial.paper.subjectTitle}</p><h1 className="text-3xl font-bold">{initial.paper.title}</h1>{initial.paper.description && <p className="text-sm text-muted">{initial.paper.description}</p>}<p className="text-sm text-muted">{initial.paper.questionCount} câu · Đạt khi đúng từ {EN_TEST_PASS_PERCENT}%</p>{initial.lastFinished && <p className="text-sm">Lần gần nhất: {initial.lastFinished.score}/{initial.lastFinished.total} ({Math.round(initial.lastFinished.score * 100 / initial.lastFinished.total)}%) · {initial.lastFinished.day} · <Link href={`/tests/results/${initial.lastFinished.attemptId}`} className="font-bold text-accent">Xem lại bài làm</Link></p>}{initial.best && (!initial.lastFinished || initial.best.score !== initial.lastFinished.score || initial.best.total !== initial.lastFinished.total) && <p className="text-sm">Cao nhất: {initial.best.score}/{initial.best.total}</p>}<Button type="button" loading={pending} onClick={() => void start()}>{attempt ? 'Làm tiếp' : 'Bắt đầu'}</Button><p className="text-xs text-muted">Bạn sẽ biết đáp án sau khi nộp bài.</p>{error && <p role="alert" className="text-sm text-error">{error}</p>}</div>}
    {stage === 'questions' && attempt && item && <><header className="space-y-3 border-b border-border pb-4"><div className="flex items-center justify-between gap-2"><button type="button" aria-label="Thoát bài kiểm tra" className="min-h-11 min-w-11 rounded-control border border-border text-xl" onClick={() => void exit()}>✕</button><span className="font-bold">Câu {position + 1}/{attempt.total}</span><Button type="button" variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>{answered}/{attempt.total} đã làm</Button></div><ProgressBar value={answered} max={attempt.total} /></header>
      <section className="flex-1 space-y-5 py-7">
        {item.type === 'mcq' ? <><h1 className="text-xl font-bold leading-relaxed sm:text-2xl">{item.prompt}</h1><div role="radiogroup" aria-label={`Câu ${position + 1}`} className="space-y-2">{item.options.map((option, index) => <button key={index} type="button" role="radio" aria-checked={answers[position] === String(index)} disabled={pending} onClick={() => void choose(index)} className={`flex min-h-12 w-full items-center gap-3 rounded-panel border p-3 text-left text-sm ${answers[position] === String(index) ? 'border-accent bg-accent-subtle' : 'border-border bg-surface'}`}><span className="font-bold">{String.fromCharCode(65 + index)}.</span><span>{option}</span></button>)}</div></> : <div className="space-y-3">
          {blank ? <div className="flex flex-wrap items-center gap-2 text-xl font-bold leading-relaxed sm:text-2xl"><span>{blank.before}</span><input value={answers[position] ?? ''} onChange={(event) => setAnswers((old) => { const next = [...old]; next[position] = event.target.value; return next; })} aria-label={`Đáp án câu ${position + 1}`} placeholder="Nhập đáp án" maxLength={200} className="min-h-12 min-w-40 flex-1 rounded-control border border-border bg-surface px-3 text-base font-normal" /><span>{blank.after}</span></div> : <><h1 className="text-xl font-bold leading-relaxed sm:text-2xl">{item.prompt}</h1><input value={answers[position] ?? ''} onChange={(event) => setAnswers((old) => { const next = [...old]; next[position] = event.target.value; return next; })} aria-label={`Đáp án câu ${position + 1}`} placeholder="Nhập đáp án" maxLength={200} className="min-h-12 w-full rounded-control border border-border bg-surface px-3 text-base" /></>}
        </div>}
      </section>
      <footer className="flex gap-2 border-t border-border pt-4"><Button type="button" variant="secondary" disabled={pending || position === 0} className="min-w-0 flex-1 px-2 text-xs sm:text-sm" onClick={() => void goTo(position - 1)}>← Câu trước</Button><Button type="button" disabled={pending} className="min-w-0 flex-1 px-2 text-xs sm:text-sm" onClick={() => { if (position === attempt.total - 1) void submit(); else void goTo(position + 1); }}>{position === attempt.total - 1 ? 'Nộp bài' : 'Câu tiếp →'}</Button></footer>{error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Danh sách câu"><div className="grid grid-cols-5 gap-2">{attempt.items.map((question, index) => <button key={question.position} type="button" onClick={() => void goTo(index)} className={`min-h-11 min-w-11 rounded-control border text-sm font-bold ${index === position ? 'border-accent' : 'border-border'} ${answers[index]?.trim() ? 'bg-accent-subtle' : 'bg-surface'}`}>{index + 1}</button>)}</div></Sheet>
      <Dialog open={confirmFinish} onClose={() => setConfirmFinish(false)} title={`Còn ${answers.filter((answer) => !answer?.trim()).length} câu chưa làm`} description="Câu chưa làm sẽ tính là sai."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setConfirmFinish(false)}>Làm tiếp</Button><Button type="button" loading={pending} onClick={() => void finish()}>Nộp bài</Button></div></Dialog>
      <Dialog open={confirmExit} onClose={() => setConfirmExit(false)} title="Thoát bài kiểm tra?" description="Câu trả lời đã được lưu. Lần sau bạn có thể làm tiếp."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setConfirmExit(false)}>Làm tiếp</Button><Button type="button" onClick={() => { router.push(subjectUrl); router.refresh(); }}>Thoát</Button></div></Dialog>
    </>}
    {stage === 'result' && result && <div className="space-y-5"><TestResultView result={result} /><div className="flex flex-wrap gap-2"><Button type="button" loading={pending} onClick={() => void start()}>Làm lại</Button><Button type="button" variant="secondary" onClick={() => { router.push(subjectUrl); router.refresh(); }}>Về khóa học</Button></div>{error && <p role="alert" className="text-sm text-error">{error}</p>}</div>}
  </div>;
}
