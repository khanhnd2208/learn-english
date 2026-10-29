'use client';

import type { ReactNode } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

/** Pinned action bar: the main buttons stay in the same place whatever the card above holds. */
export default function SessionFooter({ tone, children }: { tone?: 'correct' | 'wrong'; children: ReactNode }) {
 const surface = tone === 'correct' ? 'border-success/40 bg-success-subtle' : tone === 'wrong' ? 'border-error/30 bg-error/5' : 'border-border/60 bg-background/95';
 return <footer className={`shrink-0 border-t backdrop-blur transition-colors duration-200 motion-reduce:transition-none ${surface}`}>
  <div className="mx-auto max-w-2xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{children}</div>
 </footer>;
}

/** One fixed-height line that says right or wrong (and the right answer) without moving the buttons. */
export function ResultLine({ correct, expected, idle }: { correct?: boolean; expected?: string; idle: string }) {
 if (correct === undefined) return <p className="mb-2 flex h-6 items-center truncate text-sm text-muted">{idle}</p>;
 return <p role="status" className={`mb-2 flex h-6 items-center gap-2 truncate font-black ${correct ? 'text-success' : 'text-error'}`}>
  <MaterialIcon name={correct ? 'check_circle' : 'cancel'} filled size={20} className="shrink-0" />
  <span className="truncate">{correct ? 'Chính xác' : <>Chưa đúng · Đáp án: <span className="text-foreground">{expected}</span></>}</span>
 </p>;
}
