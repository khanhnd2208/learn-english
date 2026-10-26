'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DueForecast from '@/components/english/DueForecast';
import StudySession from '@/components/english/StudySession';
import { EN_DAILY_DUE_LIMIT } from '@/lib/english/constants';
import { isReviewDone, reviewMinutes } from '@/lib/english/reviewSummary';
import type { TodayOverview } from '@/services/english/enDailyService';

/** Review tab: the spaced-review round across every enrolled set, plus an optional extra round. */
export default function ReviewOverview({ overview }: { overview: TodayOverview }) {
	const router = useRouter();
	const [mode, setMode] = useState<'normal' | 'extra' | null>(null);
	const done = isReviewDone(overview);
	const canExtra = overview.learnedCount > overview.dueTotal;

	return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
		<header>
			<h1 className="text-4xl sm:text-5xl">Ôn tập</h1>
			<p className="mt-2 text-muted">Ôn từ của mọi bộ đang học, đúng lúc sắp quên. Đây là chế độ duy nhất đổi lịch ôn.</p>
		</header>

		<section className="mode-card sm:p-7">
			{overview.enrolledSets === 0 && overview.learnedCount === 0
				? <p className="text-muted">Chưa có từ để ôn. Hãy đăng ký một bộ từ trong Luyện tập.</p>
				: <>
					<dl className="grid grid-cols-3 gap-3 text-center">
						<div><dd className="game-number text-4xl">{overview.dueTotal}</dd><dt className="text-xs text-muted">đến hạn</dt></div>
						<div><dd className="game-number text-4xl">{overview.newCount}</dd><dt className="text-xs text-muted">từ mới hôm nay</dt></div>
						<div><dd className="game-number text-4xl">{done ? '0' : `~${reviewMinutes(overview)}`}</dd><dt className="text-xs text-muted">phút</dt></div>
					</dl>
					{overview.dueTotal > overview.dueCount && <p className="mt-4 text-center text-xs text-muted">Mỗi vòng ôn tối đa {overview.dueCount} từ. Học xong vòng này sẽ có nút Học tiếp.</p>}
					{overview.dueTotal > EN_DAILY_DUE_LIMIT && <p className="mt-2 text-center text-xs text-muted">Đang tồn nhiều từ đến hạn nên hôm nay tạm dừng từ mới.</p>}
					<div className="mt-6 flex flex-wrap justify-center gap-3">
						{!done && <button type="button" autoFocus onClick={() => setMode('normal')} className="min-h-12 rounded-control bg-accent px-6 text-lg font-bold text-accent-foreground">Bắt đầu ôn →</button>}
						<button type="button" disabled={!canExtra} onClick={() => setMode('extra')} className="min-h-12 rounded-control border border-border px-5 font-bold disabled:opacity-50">Luyện thêm 20 từ yếu nhất</button>
					</div>
					{done && <p className="mt-4 text-center font-bold text-success">✓ Đã ôn hết từ đến hạn hôm nay. {overview.tomorrowCount > 0 ? `Ngày mai có ${overview.tomorrowCount} từ.` : ''}</p>}
					{!canExtra && <p className="mt-2 text-center text-xs text-muted">Luyện thêm mở khi bạn có từ đã học nhưng chưa đến hạn.</p>}
				</>}
		</section>

		<div className="grid gap-4 md:grid-cols-2">
			<section className="mode-card">
				<h2 className="text-2xl">Lịch ôn 7 ngày tới</h2>
				<div className="mt-4"><DueForecast days={overview.dueNext7Days} /></div>
			</section>
			<section className="mode-card">
				<h2 className="text-2xl">Từ hay quên</h2>
				<ul className="mt-3 divide-y divide-border">
					{overview.recentLapses.map((word) => <li key={word.senseId} className="py-2"><span className="font-bold">{word.lemma}</span> <span className="text-sm text-muted">· {word.meaningVi}</span></li>)}
					{overview.recentLapses.length === 0 && <li className="py-2 text-sm text-muted">Chưa có từ hay quên.</li>}
				</ul>
			</section>
		</div>

		{mode && <StudySession extra={mode === 'extra'} onClose={(studied) => { setMode(null); if (studied) router.refresh(); }} />}
	</div>;
}
