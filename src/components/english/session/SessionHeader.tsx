'use client';

import MaterialIcon from '@/components/ui/MaterialIcon';

/** Shared, continuous progress header for every learning session. */
export default function SessionHeader({ label, progress, total, onExit, busy = false, xpPop }: {
 label: string;
 progress: number;
 total: number;
 onExit: () => void;
 busy?: boolean;
 xpPop?: { id: number; xp: number } | null;
}) {
 const max = Math.max(0, total);
 const done = Math.max(0, Math.min(progress, max));
 return <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur">
  <div className="mx-auto flex min-h-14 max-w-3xl items-center gap-3 px-4">
   <button type="button" onClick={onExit} disabled={busy} aria-label={`Thoát ${label}`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"><MaterialIcon name="close" size={22} /></button>
   <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-accent-subtle" role="progressbar" aria-label={`Tiến độ ${label}`} aria-valuemin={0} aria-valuemax={max || 1} aria-valuenow={done}><div className="h-full rounded-full bg-accent transition-all duration-500 motion-reduce:transition-none" style={{ width: `${max ? (done / max) * 100 : 0}%` }} /></div>
   <span className="relative shrink-0 text-xs font-bold tabular-nums text-muted">{done}/{max}{xpPop && <span key={xpPop.id} aria-hidden="true" className="animate-xp-pop xp-chip pointer-events-none absolute -top-1 right-full mr-2">+{xpPop.xp} XP</span>}</span>
  </div>
 </header>;
}
