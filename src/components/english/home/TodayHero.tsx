'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudySession from '@/components/english/StudySession';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';
import { reviewMinutes } from '@/lib/english/reviewSummary';
import { todayHeroState } from '@/lib/english/todayHero';
import { estimateReviewXp } from '@/lib/english/xp';
import type { TodayOverview } from '@/services/english/enDailyService';

const primary = 'today-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 font-bold text-accent-foreground';
const card = 'mode-card game-card-lilac flex h-full flex-col';

/** `id="srs"` keeps old quest links landing here. */
export default function TodayHero({ overview, xp, goal }: { overview: TodayOverview; xp: number; goal: number }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const state = todayHeroState({ ...overview, xp, goal });
	const minutes = reviewMinutes(overview);

	return <>
		<section id="srs" aria-label="Các cách ôn tập hôm nay" className="scroll-mt-6">
			{state === 'start' ? <div className={card}>
				<p className="label-caps text-accent">Bắt đầu</p>
				<h2 className="mt-1 text-2xl sm:text-3xl">Chọn bộ từ đầu tiên</h2>
				<p className="mt-1 text-sm text-foreground-secondary">Tải một bộ, app sẽ lên lịch ôn cho từng từ.</p>
				<Link href="/store" className={`${primary} mt-3.5 sm:w-auto sm:self-start`}>Chọn bộ từ <span aria-hidden="true">→</span></Link>
			</div> : <>
				{state === 'goal' && <p className="mb-2 text-sm font-bold text-success">✓ Đạt mục tiêu hôm nay</p>}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div className={card}>
						<div className="flex items-center justify-between gap-2"><h2 className="label-caps text-accent">Ôn luân phiên</h2>{state === 'review' && <span className="xp-chip">≈ +{estimateReviewXp(overview.dueCount, overview.newCount)} XP</span>}</div>
						<p className="mt-1 flex items-center gap-2 text-2xl font-bold">{state === 'review' ? `${overview.dueCount + overview.newCount} từ cần ôn` : '✓ Xong hôm nay'} <InfoHint title={HINTS.srs.title}>{HINTS.srs.body}</InfoHint></p>
						<p className="mt-1 text-sm text-foreground-secondary">{state === 'review' ? `${overview.dueCount} đến hạn · ${overview.newCount} từ mới · ~${minutes} phút` : `Mai có ${overview.tomorrowCount} từ đến hạn`}</p>
						<div className="mt-auto pt-3.5">{state === 'review' ? <button type="button" onClick={() => setOpen(true)} className={`${primary} mt-auto`}>Ôn luân phiên <span aria-hidden="true">→</span></button> : <button type="button" disabled className="inline-flex min-h-12 w-full items-center justify-center rounded-control border-2 border-border px-5 font-bold text-muted">Ôn luân phiên <span aria-hidden="true" className="ml-2">→</span></button>}</div>
					</div>
					<div className={card}>
						<h2 className="label-caps text-accent">Ôn theo bộ</h2>
						<p className="mt-1 text-2xl font-bold">{overview.practiceAvailable} từ trong các bộ</p>
						<p className="mt-1 text-sm text-foreground-secondary">Học 5 từ một lượt, có ôn lại câu sai{overview.practicedToday > 0 && ` · hôm nay đã làm ${overview.practicedToday} câu`}</p>
						<div className="mt-auto pt-3.5"><Link href="/review" className={primary}>Ôn theo bộ <span aria-hidden="true">→</span></Link></div>
					</div>
				</div>
			</>}
		</section>
		{open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
	</>;
}
