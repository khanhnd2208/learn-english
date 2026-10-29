import type { ReactNode } from 'react';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import type { countStages } from '@/lib/english/schedule';
import { STAGE_META } from '@/lib/english/stageMeta';

type Stages = ReturnType<typeof countStages>;

export type ChartBar = {
	key: string;
	label: string;
	/** `null` draws an empty stub: a week with no answers, a day still ahead. */
	value: number | null;
	tone?: 'accent' | 'success' | 'soft' | 'future';
	highlight?: boolean;
	display?: string;
	title: string;
};

const BAR_TONES = {
	accent: 'bg-accent',
	success: 'bg-success',
	soft: 'bg-accent/35',
	future: 'border-2 border-dashed border-border bg-transparent',
} as const;

/**
 * Small game-style column chart in plain HTML, so labels stay crisp at any width.
 * `goal` draws a dashed target line; `band` shades the "good" zone from a value up to the top.
 */
export function MiniBarChart({ bars, max, goal, band, height = 112, label, empty }: {
	bars: ChartBar[];
	max?: number;
	goal?: { value: number; label: string };
	band?: { from: number; label: string };
	height?: number;
	label: string;
	/** Shown over the plot when every bar is zero or empty. */
	empty?: string;
}) {
	const top = max ?? Math.max(1, goal?.value ?? 0, ...bars.map((bar) => bar.value ?? 0)) * 1.15;
	const pct = (value: number) => `${Math.min(100, (value / top) * 100)}%`;
	return <figure aria-label={label} className="m-0">
		<div className="relative mt-6 border-b-2 border-border" style={{ height }}>
			{band && <div aria-hidden="true" className="absolute inset-x-0 top-0 rounded-t-md bg-success/10" style={{ bottom: pct(band.from) }}><span className="absolute top-0.5 left-1 text-[10px] font-bold text-success">{band.label}</span></div>}
			{goal && <div aria-hidden="true" className="absolute inset-x-0 z-10 border-t-2 border-dashed border-gold" style={{ bottom: pct(goal.value) }}><span className="absolute -top-4 right-0 rounded bg-gold px-1 text-[10px] font-black leading-4 text-black/80">{goal.label}</span></div>}
			{empty && bars.every((bar) => !bar.value) && <p className="absolute inset-x-0 top-1/3 z-10 px-4 text-center text-xs font-bold text-muted">{empty}</p>}
			<ol className="absolute inset-0 flex items-end gap-1 sm:gap-2">
				{bars.map((bar) => <li key={bar.key} title={bar.title} aria-label={bar.title} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
					<span className={`relative w-full max-w-9 rounded-t-md transition-[height] duration-700 motion-reduce:transition-none ${bar.value === null ? 'bg-surface-container' : BAR_TONES[bar.tone ?? 'accent']} ${bar.highlight ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]' : ''}`} style={{ height: bar.value === null ? '6%' : `max(4px, ${pct(bar.value)})` }}>
						{bar.display && <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black tabular-nums text-foreground-secondary sm:text-[11px]">{bar.display}</span>}
					</span>
				</li>)}
			</ol>
		</div>
		<ol aria-hidden="true" className="mt-1 flex gap-1 sm:gap-2">{bars.map((bar) => <li key={bar.key} className={`min-w-0 flex-1 truncate text-center text-[10px] font-bold tracking-tight sm:text-[11px] ${bar.highlight ? 'text-accent' : 'text-muted'}`}>{bar.label}</li>)}</ol>
	</figure>;
}

const STAGE_PARTS = [
	['new', 'new', 'var(--border)'],
	['learning', 'learning', 'var(--gold)'],
	['remembering', 'remembering', 'var(--accent)'],
	['longTerm', 'long_term', 'var(--success)'],
] as const;

/** Ring split by memory stage with the total in the middle, plus a legend that says what each stage means. */
export function StageDonut({ stages, size = 112, stroke = 15 }: { stages: Stages; size?: number; stroke?: number }) {
	const total = STAGE_PARTS.reduce((sum, [key]) => sum + stages[key], 0);
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	let offset = 0;
	return <div className="flex flex-col items-center gap-4 sm:flex-row">
		<div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={STAGE_PARTS.map(([key, stage]) => `${STAGE_META[stage].label}: ${stages[key]}`).join(', ')}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
				<circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-container)" strokeWidth={stroke} />
				{total > 0 && STAGE_PARTS.map(([key, , color]) => {
					const length = (stages[key] / total) * circumference;
					const dash = <circle key={key} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
					offset += length;
					return stages[key] > 0 ? dash : null;
				})}
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center leading-none"><span className="game-number text-2xl tabular-nums">{total}</span><span className="mt-1 text-[11px] font-bold text-muted">từ</span></div>
		</div>
		<ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">{STAGE_PARTS.map(([key, stage, color]) => <li key={key} className="flex items-start gap-2">
			<span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-sm" style={{ background: color }} />
			<span className="min-w-0 flex-1"><span className="font-bold">{STAGE_META[stage].label}</span><span className="block text-xs text-muted">{STAGE_META[stage].hint}</span></span>
			<span className="font-black tabular-nums">{stages[key]}</span>
		</li>)}</ul>
	</div>;
}

type IconName = Parameters<typeof AdventureIcon>[0]['name'];

/** One headline number on the player card: icon, value, label and a small coloured note. */
export function StatTile({ icon, value, label, note, tone = 'muted' }: { icon: IconName; value: ReactNode; label: string; note?: ReactNode; tone?: 'up' | 'down' | 'muted' }) {
	return <div className="stat-tile flex min-w-0 items-center gap-2.5 p-2.5 text-left sm:gap-3 sm:p-3">
		<span className="shrink-0"><AdventureIcon name={icon} size={22} framed /></span>
		<div className="min-w-0">
			<p className="game-number text-lg leading-none tabular-nums sm:text-2xl">{value}</p>
			<p className="mt-1 text-xs font-bold leading-tight text-muted">{label}</p>
			{note && <p className={`mt-0.5 text-[11px] font-bold leading-tight ${tone === 'up' ? 'text-success' : tone === 'down' ? 'text-error' : 'text-muted'}`}>{note}</p>}
		</div>
	</div>;
}
