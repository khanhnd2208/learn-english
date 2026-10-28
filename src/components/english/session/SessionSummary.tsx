import type { ReactNode } from 'react';
import { AdventureIcon } from '@/components/english/AdventureIcon';

export default function SessionSummary({ title, correct, total, xp = 0, children }: { title: string; correct: number; total: number; xp?: number; children: ReactNode }) {
 return <section className="animate-fade-slide-up mx-auto w-full max-w-2xl space-y-5 rounded-panel border border-border bg-surface p-5 sm:p-8">
  <div className="space-y-2 text-center"><span className="mx-auto inline-flex rounded-full bg-success-subtle p-3 text-success"><AdventureIcon name="trophy" size={30} /></span><h2 className="text-2xl">{title}</h2><p className="game-number text-4xl tabular-nums">{correct}/{total} đúng</p>{xp > 0 && <p><span className="xp-chip px-3 py-1 text-base">+{xp} XP</span></p>}</div>
  {children}
 </section>;
}
