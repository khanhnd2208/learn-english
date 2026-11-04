'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackLink, Button, Dialog, MaterialIcon, ProgressBar, Sheet } from '@/components/ui';
import { splitBlank } from '@/lib/english/text';
import { EN_TEST_AUTO_ADVANCE_MS, EN_TEST_PASS_PERCENT } from '@/lib/english/constants';
import { firstBlankPosition, testAutoAdvanceTarget, testShowsSubmit } from '@/lib/english/testPaper';
import TestQuestionGrid from './TestQuestionGrid';
import TestResultView from './TestResultView';
import TestAttemptHistory from './TestAttemptHistory';
import type { TestResult, PublicTestAttempt, getTestPaperForLearner } from '@/services/english/enTestService';

type Initial = Awaited<ReturnType<typeof getTestPaperForLearner>>;
type Stage = 'intro' | 'questions' | 'result';
type Answer = string | null;

export default function TestRunner({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('intro');
  const [attempt, setAttempt] = useState<PublicTestAttempt | null>(initial.attempt);
  const [position, setPosition] = useState(initial.attempt?.position ?? 0);
  const [answers, setAnswers] = useState<Answer[]>(initial.attempt?.items.map((item) => item.answer) ?? []);
  const [result, setResult] = useState<TestResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const answersRef = useRef(answers);
  const positionRef = useRef(position);
  const lastQueued = useRef<Answer[]>([...answers]);
  const unsaved = useRef(new Map<number, Answer>());
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subjectUrl = '/tests/subjects/' + initial.paper.subjectId;

  useEffect(() => { window.scrollTo({ top: 0 }); }, [stage]);
  useEffect(() => () => { if (autoTimer.current) clearTimeout(autoTimer.current); }, []);

  async function api(action: object): Promise<unknown> {
    const response = await fetch('/api/tests/papers/' + initial.paper.id, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action),
    });
    const body = await response.json() as { ok?: boolean; error?: string; data?: unknown };
    if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không lưu được câu trả lời.');
    return body.data;
  }

  function reset(next: PublicTestAttempt) {
    const values = next.items.map((item) => item.answer);
    setAttempt(next);
    setPosition(next.position);
    positionRef.current = next.position;
    setAnswers(values);
    answersRef.current = values;
    lastQueued.current = [...values];
    unsaved.current.clear();
    saveQueue.current = Promise.resolve();
    setError('');
    setResult(null);
    setStage('questions');
  }

  async function start() {
    setPending(true);
    setError('');
    try { reset(await api({ action: 'start' }) as PublicTestAttempt); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Yêu cầu không hợp lệ'); }
    finally { setPending(false); }
  }

  function queueSave(index: number, value: Answer, forcePosition = false) {
    if (!attempt || (!forcePosition && value === lastQueued.current[index] && !unsaved.current.has(index))) return;
    lastQueued.current[index] = value;
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await api({ action: 'answer', attemptId: attempt.id, position: index, answer: value ?? '' });
        if (unsaved.current.get(index) === value) unsaved.current.delete(index);
        if (unsaved.current.size === 0) setError('');
      } catch {
        unsaved.current.set(index, value);
        setError('Không lưu được câu trả lời.');
      }
    });
  }

  async function flush(): Promise<boolean> {
    await saveQueue.current;
    for (const [index, value] of [...unsaved.current]) {
      try {
        await api({ action: 'answer', attemptId: attempt?.id, position: index, answer: value ?? '' });
        if (unsaved.current.get(index) === value) unsaved.current.delete(index);
      } catch { setError('Không lưu được câu trả lời.'); return false; }
    }
    if (unsaved.current.size) return false;
    // Retrying an older answer also moves the server's resume position.
    const current = positionRef.current;
    try {
      await api({ action: 'answer', attemptId: attempt?.id, position: current, answer: answersRef.current[current] ?? '' });
    } catch {
      unsaved.current.set(current, answersRef.current[current] ?? null);
      setError('Không lưu được câu trả lời.');
      return false;
    }
    setError('');
    return true;
  }

  function cancelAuto() {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = null;
  }

  function goTo(next: number) {
    if (!attempt || next < 0 || next >= attempt.total) return;
    cancelAuto();
    const previous = positionRef.current;
    queueSave(previous, answersRef.current[previous] ?? null);
    if (next !== previous) queueSave(next, answersRef.current[next] ?? null, true);
    positionRef.current = next;
    setPosition(next);
    setSheetOpen(false);
  }

  function choose(index: number) {
    if (!attempt) return;
    const current = positionRef.current;
    const wasBlank = !answersRef.current[current]?.trim();
    const value = String(index);
    const nextAnswers = [...answersRef.current];
    nextAnswers[current] = value;
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    queueSave(current, value);
    const target = testAutoAdvanceTarget({ position: current, total: attempt.total, wasBlank });
    if (target !== null || autoTimer.current) {
      cancelAuto();
      if (current + 1 < attempt.total) autoTimer.current = setTimeout(() => goTo(current + 1), EN_TEST_AUTO_ADVANCE_MS);
    }
  }

  function updateFill(value: string) {
    const nextAnswers = [...answersRef.current];
    nextAnswers[positionRef.current] = value;
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
  }

  function submit() {
    cancelAuto();
    setSheetOpen(false);
    setConfirmFinish(true);
  }

  async function finish() {
    if (!attempt || pending) return;
    setPending(true);
    queueSave(positionRef.current, answersRef.current[positionRef.current] ?? null);
    if (!await flush()) { setPending(false); return; }
    setConfirmFinish(false);
    try {
      setResult(await api({ action: 'finish', attemptId: attempt.id }) as TestResult);
      setStage('result');
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Yêu cầu không hợp lệ'); }
    finally { setPending(false); }
  }

  async function exit() {
    if (!attempt) return;
    cancelAuto();
    queueSave(positionRef.current, answersRef.current[positionRef.current] ?? null);
    if (await flush()) { router.push(subjectUrl); router.refresh(); }
    else setConfirmExit(true);
  }

  const item = attempt?.items[position];
  const blank = item?.type === 'fill' ? splitBlank(item.prompt) : null;
  const answered = answers.filter((answer) => Boolean(answer?.trim())).length;
  const firstBlank = firstBlankPosition(answers);
  const showSubmit = attempt ? testShowsSubmit({ position, total: attempt.total, answers }) : false;

  return <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
    {stage === 'intro' && <div className="mx-auto my-auto w-full max-w-xl space-y-4">
      <BackLink href={subjectUrl}>Khóa học</BackLink>
      <div className="space-y-3">
        <p className="text-sm font-bold text-accent">{initial.paper.subjectTitle}</p>
        <h1 className="text-3xl font-bold">{initial.paper.title}</h1>
        <p className="text-sm text-muted">{initial.paper.questionCount} câu · Đạt từ {EN_TEST_PASS_PERCENT}%</p>
        {initial.best && <p className="text-sm">Cao nhất {initial.best.score}/{initial.best.total}</p>}
        {attempt && <p className="text-sm">Đã làm {answered}/{attempt.total}</p>}
        <Button type="button" loading={pending} onClick={() => void start()} className="w-full sm:w-auto">{attempt ? 'Làm tiếp' : 'Bắt đầu'}</Button>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
      </div>
      <TestAttemptHistory rows={initial.history} total={initial.attemptCount} />
    </div>}

    {stage === 'questions' && attempt && item && <>
      <header className="sticky top-0 z-10 space-y-3 border-b border-border bg-background pb-3">
        <div className="flex min-h-11 items-center justify-between gap-2">
          <button type="button" aria-label="Thoát bài kiểm tra" className="inline-flex size-11 items-center justify-center rounded-control border border-border" onClick={() => void exit()}><MaterialIcon name="close" size={22} /></button>
          <button type="button" className="inline-flex min-h-11 items-center gap-1 font-bold md:hidden" aria-live="polite" onClick={() => setSheetOpen(true)}>Câu {position + 1}/{attempt.total}<MaterialIcon name="expand_more" /></button>
          <span className="hidden font-bold md:block" aria-live="polite">Câu {position + 1}/{attempt.total}</span>
          <span className="size-11 md:hidden" aria-hidden="true" />
        </div>
        <ProgressBar value={answered} max={attempt.total} />
      </header>
      <div className="flex-1 md:grid md:grid-cols-[1fr_18rem] md:gap-6">
        <main className="flex min-w-0 flex-col">
          <section className="flex-1 space-y-5 py-7">
            {item.type === 'mcq' ? <>
              <h1 className="text-lg font-bold leading-relaxed sm:text-2xl">{item.prompt}</h1>
              <div role="radiogroup" aria-label={'Câu ' + (position + 1)} className="space-y-2">
                {item.options.map((option, index) => <button key={index} type="button" role="radio" aria-checked={answers[position] === String(index)} onClick={() => choose(index)} className={'flex min-h-12 w-full items-center gap-3 rounded-panel border p-3 text-left text-base ' + (answers[position] === String(index) ? 'border-accent bg-accent-subtle' : 'border-border bg-surface')}>
                  <span className={'flex size-7 shrink-0 items-center justify-center rounded-full font-bold ' + (answers[position] === String(index) ? 'bg-accent text-accent-foreground' : 'bg-surface-container')}>{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                </button>)}
              </div>
            </> : <div className="space-y-4">
              {blank ? <h1 className="text-lg font-bold leading-relaxed sm:text-2xl">{blank.before}<span className="inline-block min-w-16 border-b-2 border-accent text-center text-accent">{answers[position] ?? ''}</span>{blank.after}</h1> : <h1 className="text-lg font-bold leading-relaxed sm:text-2xl">{item.prompt}</h1>}
              <input key={position} autoFocus value={answers[position] ?? ''} onChange={(event) => updateFill(event.target.value)} onBlur={() => queueSave(positionRef.current, answersRef.current[positionRef.current] ?? null)} onKeyDown={(event) => { if (event.key !== 'Enter') return; event.preventDefault(); if (position === attempt.total - 1) submit(); else goTo(position + 1); }} aria-label={'Đáp án câu ' + (position + 1)} placeholder="Nhập đáp án" maxLength={200} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint={position === attempt.total - 1 ? 'done' : 'next'} className="min-h-12 w-full rounded-control border border-border bg-surface px-3 text-base" />
            </div>}
          </section>
          {error && <p role="alert" className="flex items-center gap-2 text-sm text-error">{error}<Button type="button" variant="link" onClick={() => void flush()}>Thử lại</Button></p>}
          <footer className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <Button type="button" variant="secondary" disabled={position === 0} aria-label="Câu trước" className="size-12 shrink-0 p-0" onClick={() => goTo(position - 1)}><MaterialIcon name="arrow_back" /></Button>
            {showSubmit ? <>
              {position < attempt.total - 1 && <Button type="button" variant="secondary" aria-label="Câu tiếp" className="size-12 shrink-0 p-0" onClick={() => goTo(position + 1)}><MaterialIcon name="arrow_forward" /></Button>}
              <Button type="button" className="min-w-0 flex-1 text-sm" onClick={submit}>Nộp bài</Button>
            </> : <Button type="button" className="min-w-0 flex-1 text-sm" onClick={() => goTo(position + 1)}>Câu tiếp</Button>}
          </footer>
        </main>
        <aside className="hidden md:block">
          <div className="sticky top-4 space-y-3 rounded-card border border-border bg-surface p-4">
            <p className="font-bold">Đã làm {answered}/{attempt.total}</p>
            <TestQuestionGrid items={attempt.items} answers={answers} position={position} onSelect={goTo} />
            {!showSubmit && <Button type="button" variant="secondary" className="w-full" onClick={submit}>Nộp bài</Button>}
          </div>
        </aside>
      </div>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={'Đã làm ' + answered + '/' + attempt.total}>
        <TestQuestionGrid items={attempt.items} answers={answers} position={position} onSelect={goTo} mobile />
        <Button type="button" className="mt-4 w-full" onClick={submit}>Nộp bài</Button>
      </Sheet>
      <Dialog open={confirmFinish} onClose={() => setConfirmFinish(false)} title={firstBlank === null ? 'Nộp bài?' : 'Còn ' + answers.filter((answer) => !answer?.trim()).length + ' câu chưa làm'} description={firstBlank === null ? undefined : 'Câu chưa làm sẽ tính là sai.'}>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => { setConfirmFinish(false); if (firstBlank !== null) goTo(firstBlank); }}>{firstBlank === null ? 'Xem lại' : 'Đến câu ' + (firstBlank + 1)}</Button>
          <Button type="button" loading={pending} onClick={() => void finish()}>Nộp bài</Button>
        </div>
      </Dialog>
      <Dialog open={confirmExit} onClose={() => setConfirmExit(false)} title="Chưa lưu được câu trả lời" description="Thoát bây giờ sẽ mất câu vừa làm.">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmExit(false)}>Ở lại</Button>
          <Button type="button" onClick={() => { router.push(subjectUrl); router.refresh(); }}>Thoát</Button>
        </div>
      </Dialog>
    </>}

    {stage === 'result' && result && <div className="space-y-5">
      <TestResultView result={result} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" loading={pending} onClick={() => void start()}>Làm lại</Button>
        <Button type="button" variant="secondary" onClick={() => { router.push(subjectUrl); router.refresh(); }}>Về khóa học</Button>
      </div>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <TestAttemptHistory rows={initial.history} total={initial.attemptCount} currentAttemptId={result.attemptId} />
    </div>}
  </div>;
}
