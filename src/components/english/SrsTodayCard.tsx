'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudySession from '@/components/english/StudySession';
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
				<h2 id="srs-heading" className={`mt-0.5 ${compact ? 'text-lg' : 'text-2xl'}`}>{done ? '✓ Đã ôn theo lịch hôm nay' : 'Ôn theo lịch hôm nay'}</h2>
				<p className="text-xs text-muted">SRS · lặp lại ngắt quãng: hỏi lại mỗi từ đúng lúc sắp quên</p>
				{done ? <p className="mt-2 text-sm">Ngày mai có <strong className="tabular-nums">{overview.tomorrowCount}</strong> từ đến hạn.</p> : <>
					<p className="mt-2 text-sm font-bold">{dueRoundLabel(overview)}{overview.newCount > 0 ? ` · ${overview.newCount} từ mới` : ''}{minutes > 0 ? ` · ~${minutes} phút` : ''}</p>
					{overview.newCount > 0 && <p className="mt-1 text-xs text-foreground-secondary">Từ mới được hỏi lần đầu: đoán thử hoặc bấm “Không biết”, sai là bình thường.</p>}
					<p className="mt-2 text-sm text-foreground-secondary">Đúng → từ được hẹn ôn xa hơn. Sai → hẹn sớm lại.</p>
					<div className="mt-3 flex items-center gap-2 text-xs font-bold text-muted" aria-label="Khoảng cách ôn: 1, 3, 7, 21 rồi 60 ngày"><span>1</span><span className="h-px w-6 bg-border" /><span>3</span><span className="h-px w-6 bg-border" /><span>7</span><span className="h-px w-6 bg-border" /><span>21</span><span className="h-px w-6 bg-border" /><span>60 ngày</span></div>
					{!compact && <p className="mt-3"><span className="xp-chip">≈ +{estimateReviewXp(overview.dueCount, overview.newCount)} XP</span></p>}
				</>}
			</div>
			{done ? <Link href="/review" className="mt-3 inline-flex min-h-11 items-center font-bold text-accent">Học & luyện thêm →</Link> : <button type="button" disabled={total === 0} onClick={() => setOpen(true)} className="mt-4 min-h-12 rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">Bắt đầu ôn theo lịch →</button>}
		</section>
		{open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
	</>;
}
