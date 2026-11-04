'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import SubjectEnrollButton from '@/components/english/SubjectEnrollButton';
import type { VocabSubjectDetail } from '@/services/english/enVocabSubjectService';
import BackLink from '@/components/ui/BackLink';

export default function SubjectDetail({ detail, isAdmin }: { detail: VocabSubjectDetail; isAdmin: boolean }) {
  const router = useRouter();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function leave() {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/subjects/${detail.id}/enroll`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không rời được môn học');
      router.push('/store'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không rời được môn học'); }
    finally { setPending(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-10">
    <BackLink href="/store">Cửa hàng</BackLink>
    <header className="mode-card space-y-3.5 sm:space-y-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl sm:text-4xl">{detail.title}</h1><p className="mt-1 text-sm text-muted">{detail.sets.length ? `${detail.learned}/${detail.words} từ đã học${detail.longTerm > 0 ? ` · ${detail.longTerm} nhớ lâu` : ''}` : 'Môn chưa có bộ từ nào.'}</p>{detail.description && <p className="mt-1.5 text-sm text-muted">{detail.description}</p>}</div>{detail.enrolled && <details className="relative shrink-0"><summary aria-label="Tùy chọn môn học" className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-control border border-border text-xl">⋯</summary><div className="absolute right-0 z-20 mt-1 rounded-card border border-border bg-surface p-2 shadow-overlay"><Button type="button" variant="ghost" onClick={() => setConfirmLeave(true)}>Rời môn học</Button></div></details>}</div>
      {detail.words > 0 && <ProgressBar value={detail.learned} max={detail.words} className="h-2" />}
      {!detail.enrolled && detail.status === 'published' && <SubjectEnrollButton enrollUrl={`/api/subjects/${detail.id}/enroll`} href={`/subjects/${detail.id}`} locked={detail.locked} />}
    </header>
    {detail.sets.length ? <ul className="space-y-2">{detail.sets.map((set) => <li key={set.setId} className="word-row"><Link href={`/sets/${set.setId}`} className="min-w-0 flex-1"><span className="block truncate font-bold">{set.number}. {set.title}</span><span className="text-xs text-muted">{set.words} từ{set.learned > 0 ? ` · ${set.learned} đã học` : ''}{isAdmin && set.status === 'draft' ? ' · Bản nháp' : ''}</span><ProgressBar value={set.learned} max={set.words || 1} className="mt-2 h-1" /></Link></li>)}</ul> : <p className="text-sm text-muted">Môn này chưa có bộ từ nào.</p>}
    <Dialog open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Rời môn học?" description="Các bộ từ của môn sẽ rời khỏi lịch ôn. Tiến độ từ đã học vẫn được giữ nếu bạn đăng ký lại."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmLeave(false)}>Ở lại</Button><Button type="button" loading={pending} onClick={() => void leave()}>Rời môn</Button></div>{error && <p className="mt-2 text-sm text-error">{error}</p>}</Dialog>
  </div>;
}
