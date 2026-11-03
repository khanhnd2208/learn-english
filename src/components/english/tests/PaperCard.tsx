import type { ReactNode } from 'react';

export interface PaperCardData { id: string; title: string; questionCount: number; status: string }

/** One compact paper row. The drag handle is only offered from `md`; below it the arrows reorder. */
export default function PaperCard({ paper, handle, onMove, first, last, busy }: { paper: PaperCardData; handle?: ReactNode; onMove?: (direction: -1 | 1) => void; first?: boolean; last?: boolean; busy?: boolean }) {
  const arrow = 'inline-flex size-10 items-center justify-center rounded-control text-muted hover:bg-surface-hover disabled:opacity-40 md:hidden';
  return <div className="flex items-center gap-1.5 rounded-control bg-surface-container px-2 py-1.5">
    {handle}
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{paper.title}</p><p className="truncate text-xs text-muted">{paper.questionCount} câu · {paper.status === 'published' ? 'Đã xuất bản' : 'Nháp'}</p></div>
    {onMove && <>
      <button type="button" aria-label="Đưa lên" disabled={first || busy} onClick={() => onMove(-1)} className={arrow}><span aria-hidden="true">↑</span></button>
      <button type="button" aria-label="Đưa xuống" disabled={last || busy} onClick={() => onMove(1)} className={arrow}><span aria-hidden="true">↓</span></button>
    </>}
  </div>;
}
