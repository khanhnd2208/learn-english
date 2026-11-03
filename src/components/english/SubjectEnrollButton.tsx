'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function SubjectEnrollButton({ enrollUrl, href, locked = false }: { enrollUrl: string; href: string; locked?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  async function enroll() {
    setPending(true); setError('');
    try {
      const response = await fetch(enrollUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(locked ? { accessCode } : {}) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không đăng ký được môn học');
      setDone(true); router.push(href); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không đăng ký được môn học');
      if (locked) window.setTimeout(() => inputRef.current?.select(), 0);
    } finally { setPending(false); }
  }
  if (done) return <span className="text-sm font-bold text-success">Đã đăng ký</span>;
  return <div className="space-y-2">
    {!unlocking ? <Button type="button" disabled={pending} onClick={() => { if (locked) { setUnlocking(true); window.setTimeout(() => inputRef.current?.focus(), 0); } else void enroll(); }}>Đăng ký</Button>
      : <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void enroll(); }}>
        <input ref={inputRef} type="text" aria-label="Mật khẩu môn học" placeholder="Nhập mật khẩu" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} disabled={pending} className="min-h-10 min-w-32 flex-1 rounded-control border border-border bg-surface px-3 text-sm" />
        <Button type="submit" disabled={pending || !accessCode.trim()} loading={pending}>Mở khoá</Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => { setUnlocking(false); setAccessCode(''); setError(''); }}>Huỷ</Button>
      </form>}
    {error && <p className="text-sm text-error">{error}</p>}
  </div>;
}
