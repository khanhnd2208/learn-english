'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudySession from '@/components/english/StudySession';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';
import { srsTodayPreview } from '@/lib/english/reviewSummary';
import { todayHeroState } from '@/lib/english/todayHero';
import type { TodayOverview } from '@/services/english/enDailyService';

const primary = 'today-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 font-bold text-accent-foreground';
const card = 'mode-card game-card-lilac flex h-full flex-col';

/** `id="srs"` keeps old quest links landing here. */
export default function TodayHero({ overview, xp, goal }: { overview: TodayOverview; xp: number; goal: number }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const state = todayHeroState({ ...overview, xp, goal });
	const preview = srsTodayPreview(overview);

	return <>
		<section id="srs" aria-label="Các cách ôn tập hôm nay" className="scroll-mt-6">
			{state === 'start' ? <div className={card}>
				<h2 className="mt-1 text-2xl sm:text-3xl">Chọn bộ từ đầu tiên</h2>
				<Link href="/store" className={`${primary} mt-3.5 sm:w-auto sm:self-start`}>Chọn môn học <span aria-hidden="true">→</span></Link>
			</div> : <>
				{state === 'goal' && <p className="mb-2 text-sm font-bold text-success">✓ Đạt mục tiêu hôm nay</p>}
				<div className={card}>
					<div className="flex items-center justify-between gap-2"><h2 className="label-caps text-accent">Ôn luân phiên</h2>{state === 'review' && <span className="xp-chip">≈ +{preview.xp} XP</span>}</div>
					<p className="mt-2 flex items-center gap-2 text-2xl font-bold">{state === 'review' ? `${preview.total} từ cần ôn` : '✓ Xong hôm nay'} <InfoHint title={HINTS.srs.title}>{HINTS.srs.body}</InfoHint></p>
					<p className="mt-1 text-sm text-foreground-secondary">{state === 'review' ? [overview.dueCount > 0 && `${overview.dueCount} đến hạn`, overview.newCount > 0 && `${overview.newCount} từ mới`, preview.minutes > 0 && `~${preview.minutes} phút`].filter(Boolean).join(' · ') : overview.tomorrowCount > 0 ? `Mai có ${overview.tomorrowCount} từ đến hạn` : 'Mai chưa có từ đến hạn'}</p>
					{state === 'review' && <div className="mt-auto pt-3.5"><button type="button" onClick={() => setOpen(true)} className={primary}>Ôn {preview.round} từ <span aria-hidden="true">→</span></button></div>}
				</div>
			</>}
		</section>
		{open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
	</>;
}
