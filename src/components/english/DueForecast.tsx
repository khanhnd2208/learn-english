const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function dayLabel(day: string, offset: number): string {
	if (offset === 0) return 'Nay';
	if (offset === 1) return 'Mai';
	return WEEKDAY_SHORT[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? '';
}

/** Bars of words due on each of the next seven Vietnam days; today includes overdue words. */
export default function DueForecast({ days, height = 'h-28' }: { days: Array<{ day: string; count: number }>; height?: string }) {
	const max = Math.max(1, ...days.map((day) => day.count));
	return <ol className={`flex ${height} items-end gap-2`} aria-label="Số từ đến hạn trong 7 ngày tới">
		{days.map((day, offset) => <li key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-label={`${dayLabel(day.day, offset)}: ${day.count} từ`}>
			<span className="text-xs font-bold tabular-nums text-foreground-secondary">{day.count}</span>
			<span className={`w-full max-w-10 rounded-t-md ${offset === 0 ? 'bg-accent' : 'bg-accent/35'}`} style={{ height: `${Math.max(4, (day.count / max) * 70)}%` }} />
			<span className={`text-xs font-bold ${offset === 0 ? 'text-accent' : 'text-muted'}`}>{dayLabel(day.day, offset)}</span>
		</li>)}
	</ol>;
}
