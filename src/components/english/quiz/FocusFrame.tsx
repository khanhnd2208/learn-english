'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
export default function FocusFrame({ title, subtitle, progress, total, children, dirty = false, exitHref = '/sets' }: { title: string; subtitle: string; progress: number; total: number; children: ReactNode; dirty?: boolean; exitHref?: string }) {
 const router = useRouter();
 useEffect(() => { if (!dirty) return; const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
 function leave() { if (!dirty || window.confirm('Thoát bài đang làm? Tiến độ đã lưu trên server đối với bài kiểm tra.')) router.push(exitHref); }
 return <div className="fixed inset-0 z-[90] overflow-y-auto bg-background"><div className="sticky top-0 border-b border-border bg-surface p-3"><div className="mx-auto flex max-w-3xl items-center gap-3"><button type="button" onClick={leave} className="min-h-11 rounded-control px-3 font-bold focus-visible:ring-2 focus-visible:ring-accent">Thoát</button><div className="min-w-0 flex-1"><strong className="block truncate">{title}</strong><p className="text-xs text-muted">{subtitle}</p></div><strong>{Math.min(progress + 1, total)}/{total}</strong></div><div className="segment-progress mx-auto mt-2 max-w-3xl">{Array.from({ length: total }, (_, index) => <span key={index} data-done={index < progress} />)}</div></div><main className="mx-auto max-w-3xl px-4 py-8">{children}</main></div>;
}
