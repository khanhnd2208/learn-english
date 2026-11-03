'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';

export default function SubjectAdminControls({ apiUrl, title, status, listed, accessCode }: { apiUrl: string; title: string; status: string; listed: boolean; accessCode: string | null }) {
  const router = useRouter();
  const [draftCode, setDraftCode] = useState(accessCode ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function request(method: 'PATCH' | 'DELETE', data?: object) {
    setPending(true); setError('');
    try {
      const response = await fetch(apiUrl, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không cập nhật được môn học');
      setConfirmDelete(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được môn học'); }
    finally { setPending(false); }
  }
  return <div className="mt-4 space-y-3 border-t border-border pt-3 text-sm" onClick={(event) => event.stopPropagation()}>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void request('PATCH', { action: 'update', status: status === 'published' ? 'draft' : 'published' })}>{status === 'published' ? 'Ẩn môn' : 'Xuất bản'}</Button>
      <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void request('PATCH', { action: 'update', listed: !listed })}>{listed ? 'Ẩn khỏi danh sách' : 'Hiện lại'}</Button>
    </div>
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-40 flex-1"><span className="mb-1 block text-xs font-bold text-muted">Mật khẩu</span><input value={draftCode} maxLength={64} onChange={(event) => setDraftCode(event.target.value)} className="min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm" /></label><Button type="button" size="sm" disabled={pending || draftCode === (accessCode ?? '')} onClick={() => void request('PATCH', { action: 'update', accessCode: draftCode })}>Lưu</Button></div>
    <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>Xóa</Button>
    {error && <p className="text-sm text-error">{error}</p>}
    <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Xóa “${title}”?`}><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>Huỷ</Button><Button type="button" variant="destructive" loading={pending} onClick={() => void request('DELETE')}>Xóa</Button></div></Dialog>
  </div>;
}
