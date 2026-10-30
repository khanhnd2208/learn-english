import Avatar from '@/components/ui/Avatar';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import { podiumOrder } from '@/lib/english/leaderboard';
import type { LeaderboardRow } from '@/services/english/enLeaderboardService';

export default function Podium({ rows }: { rows: LeaderboardRow[] }) {
	const ordered = podiumOrder(rows.slice(0, 3));
	return <ol className="podium" aria-label="Top 3">
		{ordered.map((row, index) => {
			const columnClass = ordered.length === 1 ? 'col-start-2' : index === 0 ? 'col-start-1' : index === 1 ? 'col-start-2' : 'col-start-3';
			return <li key={row.userId} className={`flex min-w-0 flex-col items-center ${columnClass}`}>
				{row.rank === 1 && <AdventureIcon name="trophy" size={20} className="mb-1 text-gold" />}
				<Avatar src={row.avatarUrl} name={row.name} size={row.rank === 1 ? 'xxl' : 'xl'} className={`avatar-ring-${row.rank}`} />
				<div className="podium-step mt-2 w-full min-w-0" data-rank={row.rank}>
					<span className="medal" data-rank={row.rank}>{row.rank}</span>
					<div className="flex max-w-full items-center justify-center gap-1.5">
						<span className="truncate text-sm font-bold">{row.name}</span>
						{row.active && <span className="live-dot shrink-0" aria-label="Đang học" />}
					</div>
					{row.me && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">Bạn</span>}
					<span className="xp-chip">{row.xp} XP</span>
				</div>
			</li>;
		})}
	</ol>;
}
