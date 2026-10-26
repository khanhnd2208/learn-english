import type { ReactNode } from 'react';

/** Circular progress toward a target, green once it is reached. */
export default function GoalRing({ value, max, size = 56, stroke = 6, label, children }: {
	value: number;
	max: number;
	size?: number;
	stroke?: number;
	label: string;
	children?: ReactNode;
}) {
	const ratio = max > 0 ? Math.min(1, value / max) : 0;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const done = ratio >= 1;
	return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
			<circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--accent-subtle)" strokeWidth={stroke} />
			<circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={done ? 'var(--success)' : 'var(--accent)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none" />
		</svg>
		<div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">{children}</div>
	</div>;
}
