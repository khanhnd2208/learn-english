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

const primary = 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 font-bold text-accent-foreground sm:w-auto';
const secondary = 'inline-flex min-h-11 items-center font-bold text-accent hover:underline';

/** The single action the home page leads with. `id="srs"` keeps old quest links landing here. */
export default function TodayHero({ overview, xp, goal }: { overview: TodayOverview; xp: number; goal: number }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const state = todayHeroState({ ...overview, xp, goal });
	const minutes = reviewMinutes(overview);

	return <>
		<section id="srs" aria-labelledby="today-heading" className="scroll-mt-6 rounded-panel border-2 border-accent bg-accent-subtle p-5 shadow-[0_3px_0_var(--nav-shadow-active)] sm:p-6">
			<p className="label-caps text-accent">{state === 'start' ? 'Bắt đầu' : state === 'review' ? 'Ôn luân phiên' : 'Hôm nay'}</p>

			{state === 'start' && <>
				<h2 id="today-heading" className="mt-1 text-2xl sm:text-3xl">Chọn bộ từ đầu tiên</h2>
				<p className="mt-1 text-sm text-foreground-secondary">Tải một bộ, app sẽ lên lịch ôn cho từng từ.</p>
				<Link href="/store" className={`${primary} mt-4`}>Chọn bộ từ <span aria-hidden="true">→</span></Link>
			</>}

			{state === 'review' && <>
				<h2 id="today-heading" className="mt-1 flex items-center gap-2 text-2xl sm:text-3xl">{overview.dueCount + overview.newCount} từ cần ôn<InfoHint title={HINTS.srs.title}>{HINTS.srs.body}</InfoHint></h2>
				<p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-foreground-secondary">
					{overview.dueCount > 0 && <span>{overview.dueCount} từ đến hạn</span>}
					{overview.dueCount > 0 && overview.newCount > 0 && <span aria-hidden="true">·</span>}
					{overview.newCount > 0 && <span className="inline-flex items-center gap-1.5">{overview.newCount} từ mới <InfoHint title={HINTS.newWords.title}>{HINTS.newWords.body}</InfoHint></span>}
					{minutes > 0 && <><span aria-hidden="true">·</span><span>~{minutes} phút</span></>}
				</p>
				<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
					<button type="button" onClick={() => setOpen(true)} className={primary}>Ôn luân phiên <span aria-hidden="true">→</span></button>
					<span className="xp-chip">≈ +{estimateReviewXp(overview.dueCount, overview.newCount)} XP</span>
				</div>
			</>}

			{(state === 'more' || state === 'goal') && <>
				<h2 id="today-heading" className="mt-1 text-2xl sm:text-3xl">{state === 'goal' ? 'Đạt mục tiêu hôm nay' : '✓ Xong phần ôn luân phiên'}</h2>
				<p className="mt-1 text-sm text-foreground-secondary">{overview.tomorrowCount > 0 ? `Mai có ${overview.tomorrowCount} từ đến hạn.` : 'Mai chưa có từ đến hạn.'}{state === 'more' && ' Còn sức thì ôn theo bộ vài từ.'}</p>
				{state === 'more'
					? <Link href="/review" className={`${primary} mt-4`}>Ôn theo bộ <span aria-hidden="true">→</span></Link>
					: <Link href="/review" className={`${secondary} mt-2`}>Ôn theo bộ vài từ →</Link>}
			</>}

			{state === 'review' && <Link href="/review" className={`${secondary} mt-1`}>Hoặc ôn theo bộ từ mới →</Link>}
		</section>
		{open && <StudySession onClose={(studied) => { setOpen(false); if (studied) router.refresh(); }} />}
	</>;
}
