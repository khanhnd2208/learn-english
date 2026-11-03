'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import SubjectEnrollButton from '@/components/english/SubjectEnrollButton';
import type { TestSubjectDetail as TestSubjectDetailData } from '@/services/english/enTestSubjectService';

export default function TestSubjectDetail({ detail, isAdmin }: { detail: TestSubjectDetailData; isAdmin: boolean }) {
  const router = useRouter();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function leave() {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/tests/subjects/${detail.id}/enroll`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không rời được môn học');
      router.push('/tests'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không rời được môn học'); }
    finally { setPending(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-10">
    <Link href="/tests" className="inline-flex min-h-10 items-center text-sm font-bold text-accent">← Môn học</Link>
    <header className="mode-card space-y-3.5 sm:space-y-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl sm:text-4xl">{detail.title}</h1>{detail.papers.length > 0 && <p className="mt-1 text-sm text-muted">{detail.papers.length} bài kiểm tra</p>}{detail.description && <p className="mt-1.5 text-sm text-muted">{detail.description}</p>}</div>{detail.enrolled && <details className="relative shrink-0"><summary aria-label="Tùy chọn môn học" className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-control border border-border text-xl">⋯</summary><div className="absolute right-0 z-20 mt-1 rounded-card border border-border bg-surface p-2 shadow-overlay"><Button type="button" variant="ghost" onClick={() => setConfirmLeave(true)}>Rời môn học</Button></div></details>}</div>
      {!detail.enrolled && detail.status === 'published' && <SubjectEnrollButton enrollUrl={`/api/tests/subjects/${detail.id}/enroll`} href={`/tests/subjects/${detail.id}`} locked={detail.locked} />}
    </header>
    {!detail.enrolled && !isAdmin && <p className="text-sm text-muted">Đăng ký môn học để làm bài kiểm tra.</p>}
    {detail.papers.length ? <ul className="space-y-2">{detail.papers.map((paper) => <li key={paper.id} className="word-row"><div className="min-w-0 flex-1"><p className="truncate font-bold">{paper.title}</p><p className="text-xs text-muted">{paper.questionCount} câu{isAdmin && paper.status === 'draft' ? ' · Bản nháp' : ''}</p></div>{paper.inProgress ? <span className="shrink-0 text-xs font-bold text-accent">Đang làm</span> : paper.best ? <span className="shrink-0 text-xs font-bold text-muted">{paper.best.passed ? `Đạt · ${paper.best.score}/${paper.best.total}` : `Cao nhất ${paper.best.score}/${paper.best.total}`}</span> : null}{detail.enrolled || isAdmin ? <Link href={`/tests/papers/${paper.id}`} className="inline-flex min-h-10 shrink-0 items-center rounded-control bg-accent px-3 text-xs font-bold text-accent-foreground">{paper.inProgress ? 'Làm tiếp' : paper.best ? 'Làm lại' : 'Làm bài'}</Link> : <span className="inline-flex min-h-10 shrink-0 items-center rounded-control bg-surface-container px-3 text-xs font-bold text-muted">Làm bài</span>}</li>)}</ul> : <p className="text-sm text-muted">Môn này chưa có bài kiểm tra.</p>}
    <Dialog open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Rời môn học?" description="Bạn sẽ không làm bài được nữa cho tới khi đăng ký lại. Kết quả cũ vẫn được giữ."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmLeave(false)}>Ở lại</Button><Button type="button" loading={pending} onClick={() => void leave()}>Rời môn</Button></div>{error && <p className="mt-2 text-sm text-error">{error}</p>}</Dialog>
  </div>;
}
