import Link from 'next/link';
import StageBar from '@/components/english/StageBar';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';
import type { countStages } from '@/lib/english/schedule';
import type { LevelInfo } from '@/lib/english/xp';

type Stages = ReturnType<typeof countStages>;

function Stat({ value, label, hint }: { value: string | number; label: string; hint?: React.ReactNode }) {
	return <div className="flex min-w-0 flex-col-reverse">
		<dt className="flex min-h-5 items-center gap-1 truncate text-xs font-bold text-muted">{label}{hint}</dt>
		<dd className="game-number text-2xl tabular-nums">{value}</dd>
	</div>;
}

/** How the learner is doing, readable in three seconds: streak, words kept long-term, level. Today's XP lives on the quest note. */
export default function ProgressStrip({ streak, longTerm, level, stages }: {
	streak: number;
	longTerm: number;
	level: LevelInfo;
	stages: Stages;
}) {
	return <section aria-labelledby="progress-heading" className="mode-card space-y-4">
		<div className="flex items-center justify-between gap-2">
			<h2 id="progress-heading" className="text-lg">Tiến bộ</h2>
			<Link href="/progress" className="inline-flex min-h-11 items-center text-sm font-bold text-accent">Chi tiết →</Link>
		</div>
		<dl className="grid grid-cols-3 gap-3">
			<Stat value={streak} label="Ngày liên tiếp" />
			<Stat value={longTerm} label="Nhớ lâu" hint={<InfoHint title={HINTS.stages.title}>{HINTS.stages.body}</InfoHint>} />
			<Stat value={`Lv ${level.level}`} label={level.title} />
		</dl>
		<div>
			<p className="mb-1.5 text-xs font-bold text-muted">Mức nhớ các từ</p>
			<StageBar stages={stages} />
		</div>
	</section>;
}
