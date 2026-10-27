'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudySession from '@/components/english/StudySession';
import { isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import { estimateReviewXp } from '@/lib/english/xp';
import type { TodayOverview } from '@/services/english/enDailyService';

/** Today's SRS round: due words plus new words, with a button that opens the study session. */
export default function SrsTodayCard({ overview, compact = false }: { overview: TodayOverview; compact?: boolean }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const done = isReviewDone(overview);
	const total = overview.dueCount + overview.newCount;

	return <>
		<section id="srs" aria-labelledby="srs-heading" className={`mode-card scroll-mt-6 border-2 border-accent bg-accent-subtle ${compact ? 'p-4' : 'p-6'}`}>
			<div>
				<h2 id="srs-heading" className={compact ? 'text-lg' : 'text-2xl'}>{done ? '✓ Đã kiểm tra xong hôm nay' : 'Kiểm tra SRS hôm nay'}</h2>
				<p className="mt-1 text-sm">{done ? `Ngày mai có ${overview.tomorrowCount} từ` : `${overview.dueCount} từ đến hạn · ${overview.newCount} từ mới · ~${reviewMinutes(overview)} phút`}</p>
				{!done && <p className="mt-2 text-sm text-foreground-secondary">Trả lời đúng → từ được hẹn ôn xa hơn. Sai → hẹn sớm lại.</p>}
				{!done && <div className="mt-3 flex items-center gap-2 text-xs font-bold text-muted"><span>1</span><span className="h-px w-6 bg-border" /><span>3</span><span className="h-px w-6 bg-border" /><span>7</span><span className="h-px w-6 bg-border" /><span>21</span><span className="h-px w-6 bg-border" /><span>60 ngày</span></div>}
				{!compact && !done && <p className="mt-3"><span className="xp-chip">≈ +{estimateReviewXp(overview.dueCount, overview.newCount)} XP</span></p>}
				{done && <p className="mt-2 text-sm text-muted">Muốn luyện thêm? Sang Ôn tập →</p>}
			</div>
			{done ? <a href="/review" className="mt-3 inline-flex min-h-11 items-center font-bold text-accent">Sang Ôn tập →</a> : <button type="button" disabled={total === 0} onClick={() => setOpen(true)} className="mt-4 min-h-12 rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">Bắt đầu kiểm tra →</button>}
		</section>
		{open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
	</>;
}
