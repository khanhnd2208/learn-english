'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { AdminVocabSubjectsData } from '@/services/english/enVocabSubjectService';

export default function EnglishAdminSubjects({ data }: { data: AdminVocabSubjectsData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  async function request(key: string, path: string, method: 'POST' | 'PATCH', payload: object) {
    setPending(key); setError('');
    try {
      const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không cập nhật được môn học');
      if (key === 'create') { setTitle(''); setDescription(''); toast('Đã tạo môn học.', 'success'); }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được môn học'); }
    finally { setPending(''); }
  }
  return <div className="space-y-4">
    <Card><CardContent className="space-y-3"><h2 className="text-xl font-bold">Tạo môn học</h2><label className="block text-sm font-bold">Tên môn học<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label><label className="block text-sm font-bold">Mô tả<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-surface p-3 font-normal" /></label><Button type="button" disabled={!title.trim() || Boolean(pending)} onClick={() => void request('create', '/api/admin/subjects', 'POST', { title, description })}>Tạo môn học</Button></CardContent></Card>
    {data.subjects.map((subject) => <Card key={subject.id}><CardContent className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{subject.title}</h2><span className="rounded-full bg-surface-container px-2 py-1 text-xs font-bold">{subject.status === 'draft' ? 'Bản nháp' : subject.status === 'suspended' ? 'Tạm dừng' : 'Đã xuất bản'}</span></div>{(subject.setsList.length > 0 || Boolean(subject.learners)) && <p className="text-xs text-muted">{[subject.setsList.length > 0 ? `${subject.setsList.length} bộ` : '', subject.learners ? `${subject.learners} học viên` : ''].filter(Boolean).join(' · ')}</p>}
      {subject.setsList.length ? <ul className="divide-y divide-border">{subject.setsList.map((set, index) => <li key={set.id} className="flex items-center gap-2 py-2"><span className="min-w-0 flex-1 truncate text-sm">{index + 1}. {set.title}{set.status === 'draft' ? ' · Bản nháp' : ''}</span><Button type="button" size="sm" variant="ghost" aria-label={`Đưa ${set.title} lên`} disabled={Boolean(pending) || index === 0} onClick={() => void request(subject.id, `/api/admin/subjects/${subject.id}`, 'PATCH', { action: 'move', setId: set.id, direction: 'up' })}>↑</Button><Button type="button" size="sm" variant="ghost" aria-label={`Đưa ${set.title} xuống`} disabled={Boolean(pending) || index === subject.setsList.length - 1} onClick={() => void request(subject.id, `/api/admin/subjects/${subject.id}`, 'PATCH', { action: 'move', setId: set.id, direction: 'down' })}>↓</Button><Button type="button" size="sm" variant="secondary" disabled={Boolean(pending)} onClick={() => void request(subject.id, `/api/admin/subjects/${subject.id}`, 'PATCH', { action: 'removeSet', setId: set.id })}>Gỡ</Button></li>)}</ul> : <p className="text-sm text-muted">Chưa có bộ. Thêm bộ từ danh sách bên dưới.</p>}
      {data.unassignedSets.length > 0 && <div className="flex flex-wrap gap-2"><select aria-label="Chọn bộ để thêm" value={selected[subject.id] ?? ''} onChange={(event) => setSelected({ ...selected, [subject.id]: event.target.value })} className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm"><option value="">Chọn bộ chưa xếp môn…</option>{data.unassignedSets.map((set) => <option key={set.id} value={set.id}>{set.title}</option>)}</select><Button type="button" disabled={Boolean(pending) || !selected[subject.id]} onClick={() => void request(subject.id, `/api/admin/subjects/${subject.id}`, 'PATCH', { action: 'addSet', setId: selected[subject.id] })}>Thêm bộ</Button></div>}
    </CardContent></Card>)}
    {data.subjects.length === 0 && <p className="text-sm text-muted">Chưa có môn học. Tạo môn đầu tiên ở trên.</p>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}
