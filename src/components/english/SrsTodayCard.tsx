'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudySession from '@/components/english/StudySession';
import { isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import { estimateReviewXp } from '@/lib/english/xp';
import type { TodayOverview } from '@/services/english/enDailyService';

/** Today's SRS round: due words plus new words, with a button that opens the study session. */
export default function SrsTodayCard({ overview }: { overview: TodayOverview }) {
	const router = useRouter();
	const [mode, setMode] = useState<'normal' | 'extra' | null>(null);
	const done = isReviewDone(overview);
	const total = overview.dueCount + overview.newCount;

	return <>
		<section id="srs" aria-labelledby="srs-heading" className="mode-card flex scroll-mt-6 flex-wrap items-center justify-between gap-4 border-2 border-accent bg-accent-subtle p-6">
			<div>
				<h2 id="srs-heading" className="text-2xl">{done ? '✓ SRS hôm nay đã xong' : 'SRS hôm nay'}</h2>
				<p className="mt-1 text-sm">{done ? 'Bạn đã ôn hết từ đến hạn hôm nay.' : `${overview.dueTotal} từ đến hạn + ${overview.newCount} từ mới · ~${reviewMinutes(overview)} phút`}</p>
				{!done && <p className="mt-2"><span className="xp-chip">≈ +{estimateReviewXp(overview.dueCount, overview.newCount)} XP</span></p>}
				{done && <p className="mt-2 text-xs text-muted">Luyện thêm vẫn được XP, chung trần 300 XP/ngày với Ôn tập.</p>}
			</div>
			<button type="button" disabled={!done && total === 0} onClick={() => setMode(done ? 'extra' : 'normal')} className="min-h-12 rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50">{done ? 'Luyện thêm →' : 'Học SRS →'}</button>
		</section>
		{mode && <StudySession extra={mode === 'extra'} onClose={(studied) => { setMode(null); if (studied) router.refresh(); }} />}
	</>;
}
