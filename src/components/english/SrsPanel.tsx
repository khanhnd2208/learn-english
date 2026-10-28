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
  <h2 className="text-2xl">Ôn luân phiên</h2>
  <p className="text-sm text-muted">Chỉ có câu kiểm tra. Đúng thì từ lên cấp và hẹn ôn xa hơn; sai thì xuống cấp và gặp lại sớm.</p>
  <dl className="grid grid-cols-3 gap-2 text-center">{[[overview.dueTotal, 'đến hạn'], [overview.newCount, 'từ mới'], [overview.longTermCount, 'nhớ lâu']].map(([count, label]) => <div key={label} className="rounded-panel border border-border p-3"><dt className="text-sm text-muted">{label}</dt><dd className="text-2xl font-bold">{count}</dd></div>)}</dl>
  {!overview.enrolledSets && !overview.learnedCount ? <Link href="/store" className="font-bold text-accent">Chọn bộ từ →</Link> : done ? <p className="font-bold text-success">✓ Xong phần ôn hôm nay</p> : <button type="button" onClick={() => setOpen(true)} className="min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground">Bắt đầu ôn →</button>}
  {open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
 </section>;
}
