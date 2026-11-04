'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { splitBlank } from '@/lib/english/text';
import { testReviewCounts, testReviewStatus, type TestReviewStatus } from '@/lib/english/testPaper';
import type { TestResult } from '@/services/english/enTestService';

const LABEL: Record<TestReviewStatus, string> = { correct: 'Đúng', wrong: 'Sai', blank: 'Bỏ trống' };
const ICON: Record<TestReviewStatus, string> = { correct: 'check_circle', wrong: 'cancel', blank: 'remove' };
const MARK: Record<TestReviewStatus, string> = { correct: '✓', wrong: '✕', blank: '–' };
const TILE: Record<TestReviewStatus, string> = { correct: 'bg-success-subtle', wrong: 'bg-error/5', blank: 'bg-surface-container' };
const CARD: Record<TestReviewStatus, string> = { correct: 'border-success/40', wrong: 'border-error/40', blank: 'border-border' };
const TONE: Record<TestReviewStatus, string> = { correct: 'text-success', wrong: 'text-error', blank: 'text-muted' };

export default function TestResultView({ result }: { result: TestResult }) {
  const counts = testReviewCounts(result.items);
  const [wrongOnly, setWrongOnly] = useState(counts.wrong + counts.blank > 0);
  const rows = result.items.map((question) => ({ question, status: testReviewStatus(question) }));
  const summary = ([['Đúng', counts.correct], ['Sai', counts.wrong], ['Bỏ trống', counts.blank]] as const).filter(([, count]) => count > 0).map(([label, count]) => `${label} ${count}`).join(' · ');
  const allCorrect = counts.wrong + counts.blank === 0;
  return <div className="space-y-5">
    <div className="space-y-2 text-center"><h1 className="text-4xl font-bold">{result.score}/{result.total}</h1><p className="text-xl">{result.percent}% · {result.passed ? 'Đạt' : 'Chưa đạt'}</p><p className="text-sm text-muted">{summary}</p></div>
    <nav aria-label="Danh sách câu" className="grid grid-cols-6 gap-2">{rows.map(({ question, status }) => <a key={question.position} href={`#cau-${question.position + 1}`} onClick={(event) => { event.preventDefault(); if (wrongOnly && status === 'correct') setWrongOnly(false); requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('cau-' + (question.position + 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))); }} aria-label={`Câu ${question.position + 1}: ${LABEL[status]}`} className={`flex min-h-11 flex-col items-center justify-center rounded-control text-sm font-bold ${TILE[status]}`}><span>{question.position + 1}</span><span className={`text-xs ${TONE[status]}`}>{MARK[status]}</span></a>)}</nav>
    {!allCorrect && <div className="flex gap-2"><Button type="button" variant={wrongOnly ? 'primary' : 'secondary'} aria-pressed={wrongOnly} onClick={() => setWrongOnly(true)}>Câu sai ({counts.wrong + counts.blank})</Button><Button type="button" variant={!wrongOnly ? 'primary' : 'secondary'} aria-pressed={!wrongOnly} onClick={() => setWrongOnly(false)}>Tất cả</Button></div>}
    <ul className="space-y-3">{rows.filter(({ status }) => !wrongOnly || status !== 'correct').map(({ question, status }) => {
      const blank = question.type === 'fill' ? splitBlank(question.prompt) : null;
      const typed = question.answer === null ? '___' : question.answer;
      return <li key={question.position} id={`cau-${question.position + 1}`} className={`scroll-mt-4 rounded-panel border bg-surface p-4 ${CARD[status]}`}>
        <p className={`flex items-center gap-1 text-sm font-bold ${TONE[status]}`}><MaterialIcon name={ICON[status]} filled />Câu {question.position + 1} · {LABEL[status]}</p>
        {question.type === 'mcq' ? <>
          <p className="mt-2 font-bold">{question.prompt}</p>
          <ul className="mt-2 space-y-1">{question.options.map((option, index) => {
            const chosen = question.answer === String(index);
            const right = option === question.correctText && question.options.indexOf(option) === index;
            return <li key={index} className={`flex items-start gap-2 rounded-control px-3 py-2 text-sm ${right ? 'bg-success-subtle' : chosen ? 'bg-error/5' : ''}`}><span className="font-bold">{String.fromCharCode(65 + index)}.</span><span className="min-w-0 flex-1">{option}</span>{right || chosen ? <span className={`shrink-0 ${right ? 'text-success' : 'text-error'}`}><MaterialIcon name={right ? 'check_circle' : 'cancel'} filled /><span className="sr-only">{right ? 'Đúng' : 'Sai'}</span></span> : null}</li>;
          })}</ul>
          {question.answer === null && <p className="mt-2 text-sm text-muted">Chưa trả lời</p>}
        </> : <>
          <p className="mt-2 font-bold">{blank ? <>{blank.before}<span className={status === 'correct' ? 'text-success' : status === 'wrong' ? 'text-error line-through' : 'text-muted'}>{typed}</span>{blank.after}</> : question.prompt}</p>
          <p className="mt-2 text-sm">Bạn điền: {question.answer === null ? 'Chưa trả lời' : question.answer}</p>
          <p className="text-sm">{question.answers.length >= 2 ? `Đáp án chấp nhận: ${question.answers.join(' / ')}` : `Đáp án: ${question.correctText}`}</p>
        </>}
        {question.explanationVi && <p className="mt-2 text-sm text-muted">Giải thích: {question.explanationVi}</p>}
      </li>;
    })}</ul>
  </div>;
}
