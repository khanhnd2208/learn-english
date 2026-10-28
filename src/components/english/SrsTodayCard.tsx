'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudySession from '@/components/english/StudySession';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';
import { dueRoundLabel, isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import { estimateReviewXp } from '@/lib/english/xp';
import type { TodayOverview } from '@/services/english/enDailyService';

/** Today's scheduled review (SRS): due words plus new words, with a button that opens the session. */
export default function SrsTodayCard({ overview, compact = false }: { overview: TodayOverview; compact?: boolean }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const done = isReviewDone(overview);
	const total = overview.dueCount + overview.newCount;
	const minutes = reviewMinutes(overview);

	return <>
		<section id="srs" aria-labelledby="srs-heading" className={`mode-card scroll-mt-6 border-2 border-accent bg-accent-subtle ${compact ? 'p-4' : 'p-6'}`}>
			<div>
				<p className="text-xs font-bold uppercase tracking-wide text-accent">{done ? 'Xong việc chính hôm nay' : 'Việc nên làm trước'}</p>
				<h2 id="srs-heading" className={`mt-0.5 flex items-center gap-2 ${compact ? 'text-lg' : 'text-2xl'}`}>{done ? '✓ Đã ôn theo lịch hôm nay' : 'Ôn theo lịch hôm nay'}<InfoHint title={HINTS.srs.title}>{HINTS.srs.body}</InfoHint></h2>
				{done ? <p className="mt-2 text-sm">Ngày mai có <strong className="tabular-nums">{overview.tomorrowCount}</strong> từ đến hạn.</p> : <>
					<p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm font-bold">{dueRoundLabel(overview)}{overview.newCount > 0 && <> · {overview.newCount} từ mới <InfoHint title={HINTS.newWords.title}>{HINTS.newWords.body}</InfoHint></>}{minutes > 0 && ` · ~${minutes} phút`}</p>
					{!compact && <p className="mt-3"><span className="xp-chip">≈ +{estimateReviewXp(overview.dueCount, overview.newCount)} XP</span></p>}
				</>}
			</div>
			{done ? <Link href="/review" className="mt-3 inline-flex min-h-11 items-center font-bold text-accent">Học & luyện thêm →</Link> : <button type="button" disabled={total === 0} onClick={() => setOpen(true)} className="mt-4 min-h-12 rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">Bắt đầu ôn theo lịch →</button>}
		</section>
		{open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
	</>;
}
