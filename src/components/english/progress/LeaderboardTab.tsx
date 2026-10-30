'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import { englishSend } from '@/components/english/englishApi';
import Podium from '@/components/english/progress/Podium';
import { cn } from '@/lib/cn';
import { AVATAR_CHANGED_EVENT } from '@/lib/english/avatar';
import { LEADERBOARD_PERIODS, type LeaderboardPeriod } from '@/lib/english/leaderboard';
import type { Leaderboard, LeaderboardRow } from '@/services/english/enLeaderboardService';

function RankRow({ row }: { row: LeaderboardRow }) {
	return <li className={cn('word-row flex items-center gap-3 px-3 py-2', row.me && 'rank-row-me')}>
		<span className="w-8 shrink-0 text-center font-black tabular-nums text-muted">{row.rank}</span>
		<Avatar src={row.avatarUrl} name={row.name} size="md" />
		<div className="min-w-0 flex-1">
			<p className="truncate font-bold">{row.name}</p>
			<div className="flex items-center gap-1 text-xs text-muted">
				<span>Lv {row.level}</span>
				{row.active && <><span aria-hidden="true"> · </span><span className="live-dot shrink-0" /><span>Đang học</span></>}
			</div>
		</div>
		<span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums">{row.xp} XP</span>
		{row.me && <span className="shrink-0 rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">Bạn</span>}
	</li>;
}

export default function LeaderboardTab({ weekResetsIn }: { weekResetsIn: string }) {
	const [period, setPeriod] = useState<LeaderboardPeriod>('week');
	const [data, setData] = useState<Partial<Record<LeaderboardPeriod, Leaderboard>>>({});
	const [error, setError] = useState(false);
	const [retry, setRetry] = useState(0);
	const current = data[period];

	useEffect(() => {
		if (data[period]) return;
		let active = true;
		void englishSend<Leaderboard>(`/api/leaderboard?period=${period}`, 'GET')
			.then((result) => { if (active) setData((previous) => ({ ...previous, [period]: result })); })
			.catch(() => { if (active) setError(true); });
		return () => { active = false; };
	}, [data, period, retry]);

	useEffect(() => {
		const updateMyAvatar = (event: Event) => {
			const { avatarUrl } = (event as CustomEvent<{ avatarUrl: string | null }>).detail;
			setData((previous) => {
				const next = { ...previous };
				for (const value of LEADERBOARD_PERIODS) {
					const board = previous[value];
					if (!board) continue;
					next[value] = {
						...board,
						rows: board.rows.map((row) => row.me ? { ...row, avatarUrl } : row),
						me: { ...board.me, avatarUrl },
					};
				}
				return next;
			});
		};
		window.addEventListener(AVATAR_CHANGED_EVENT, updateMyAvatar);
		return () => window.removeEventListener(AVATAR_CHANGED_EVENT, updateMyAvatar);
	}, []);

	function tryAgain() {
		setError(false);
		setRetry((value) => value + 1);
	}

	function selectPeriod(value: LeaderboardPeriod) {
		setError(false);
		setPeriod(value);
	}

	return <div className="space-y-4">
		<div>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div role="radiogroup" aria-label="Kỳ xếp hạng" className="flex gap-2">
					{([['week', 'Tuần này'], ['all', 'Mọi lúc']] as const).map(([value, label]) => <button
						key={value}
						type="button"
						role="radio"
						aria-checked={period === value}
						onClick={() => selectPeriod(value)}
						className={cn('min-h-10 whitespace-nowrap rounded-control px-3 text-sm font-bold', period === value ? 'bg-accent text-accent-foreground' : 'border border-border bg-surface')}
					>{label}</button>)}
				</div>
				{current && current.activeNow > 0 && <span className="flex items-center gap-2 text-sm font-bold text-muted"><span className="live-dot" />{current.activeNow} người đang học</span>}
			</div>
			{period === 'week' && <p className="mt-1 text-xs text-muted">Bảng tuần đặt lại sau {weekResetsIn}</p>}
		</div>

		{error ? <ErrorState title="Không tải được bảng xếp hạng" description="Kiểm tra mạng rồi thử lại." onRetry={tryAgain} />
			: !current ? <section className="mode-card space-y-5" aria-label="Đang tải bảng xếp hạng">
				<div className="grid grid-cols-3 items-end gap-2">
					<Skeleton className="mx-auto h-14 w-14 rounded-full" />
					<Skeleton className="mx-auto h-18 w-18 rounded-full" />
					<Skeleton className="mx-auto h-14 w-14 rounded-full" />
				</div>
				<Skeleton lines={5} />
			</section>
			: current.rows.length === 0 ? <EmptyState
				icon="trophy"
				title="Bảng xếp hạng còn trống"
				description={period === 'week' ? 'Tuần này chưa ai có XP. Ôn vài từ để giành hạng 1!' : 'Chưa ai có XP. Ôn vài từ để giành hạng 1!'}
				action={{ label: 'Ôn ngay', href: '/' }}
			/>
			: <>
				<section className="mode-card"><Podium rows={current.rows.slice(0, 3)} /></section>
				{current.rows.length > 3 && <ol className="space-y-2">{current.rows.slice(3).map((row) => <RankRow key={row.userId} row={row} />)}</ol>}
				{!current.rows.some((row) => row.me) && (current.me.rank !== null
					? <div className="space-y-2"><p className="text-center text-xs text-muted">…</p><ol><RankRow row={current.me} /></ol></div>
					: <div className="mode-card flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">{period === 'week' ? 'Bạn chưa có XP tuần này. Trả lời vài câu để vào bảng.' : 'Bạn chưa có XP. Trả lời vài câu để vào bảng.'}</p><Link href="/" className="whitespace-nowrap font-bold text-accent">Ôn ngay</Link></div>)}
				{current.players > 0 && <p className="text-xs text-muted">{current.players} người trong bảng</p>}
			</>}
	</div>;
}
