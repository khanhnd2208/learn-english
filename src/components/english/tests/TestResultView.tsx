'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { EN_TEST_PASS_PERCENT } from '@/lib/english/constants';
import type { TestResult } from '@/services/english/enTestService';

export default function TestResultView({ result }: { result: TestResult }) {
  const [wrongOnly, setWrongOnly] = useState(false);
  return <div className="space-y-5">
    <div className="space-y-2 text-center"><h1 className="text-4xl font-bold">{result.score}/{result.total}</h1><p className="text-xl">{result.percent}%</p><span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${result.passed ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>{result.passed ? 'Đạt' : `Chưa đạt · cần ${EN_TEST_PASS_PERCENT}%`}</span></div>
    <Button type="button" variant="secondary" onClick={() => setWrongOnly(!wrongOnly)}>{wrongOnly ? 'Tất cả câu' : 'Chỉ câu sai'}</Button>
    <ul className="space-y-3">{result.items.filter((question) => !wrongOnly || !question.correct).map((question) => <li key={question.position} className={`rounded-panel border bg-surface p-4 ${question.correct ? 'border-success/40' : 'border-error/40'}`}><p className="font-bold">Câu {question.position + 1} · {question.prompt}</p><p className="mt-2 text-sm">{question.type === 'mcq' ? 'Bạn chọn:' : 'Bạn điền:'} {question.answer === null ? 'Chưa trả lời' : question.type === 'mcq' ? question.options[Number(question.answer)] ?? question.answer : question.answer}</p><p className="text-sm">Đáp án: {question.correctText}</p>{question.explanationVi && <p className="mt-1 text-sm text-muted">Giải thích: {question.explanationVi}</p>}</li>)}</ul>
    {wrongOnly && result.items.every((question) => question.correct) && <p className="text-sm text-muted">Bạn không sai câu nào.</p>}
  </div>;
}
