'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StudySession from '@/components/english/StudySession';
import { isReviewDone } from '@/lib/english/reviewSummary';
import type { TodayOverview } from '@/services/english/enDailyService';

export default function SrsPanel({ overview }: { overview: TodayOverview }) {
 const [open, setOpen] = useState(false);
 const router = useRouter();
 const done = isReviewDone(overview);
 return <section className="mode-card space-y-4" aria-label="Ôn luân phiên">
  <p className="text-sm text-muted">Gõ lại từ tiếng Anh theo nghĩa. Đúng thì từ lên cấp và hẹn ôn xa hơn; sai thì gặp lại sớm.</p>
  <dl className="grid grid-cols-3 gap-2 text-center">{[[overview.dueTotal, 'Đến hạn'], [overview.newCount, 'Từ mới'], [overview.longTermCount, 'Nhớ lâu']].map(([count, label]) => <div key={label} className=" flex flex-col-reverse rounded-panel border border-border p-3"><dt className="mt-1 text-xs font-bold text-muted">{label}</dt><dd className="game-number text-2xl tabular-nums">{count}</dd></div>)}</dl>
  {!overview.enrolledSets && !overview.learnedCount ? <Link href="/store" className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-accent px-5 font-bold text-accent-foreground">Chọn bộ từ →</Link> : done ? <p className="font-bold text-success">✓ Xong phần ôn hôm nay</p> : <button type="button" onClick={() => setOpen(true)} className="min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground">Bắt đầu ôn →</button>}
  {open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
 </section>;
}
