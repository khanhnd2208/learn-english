import type { GoalBoard } from '@/services/english/enGoalService';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Monday to Sunday: goal met, studied, not yet, or still ahead. Missed days stay neutral. */
export default function WeekStrip({ days }: { days: GoalBoard['week']['days'] }) {
	return <div>
		<ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Tuần này">
			{days.map((entry, index) => {
				const state = entry.goalMet ? 'goal' : entry.studied ? 'studied' : entry.isFuture ? 'future' : 'empty';
				const tile = state === 'goal' ? 'is-done' : state === 'studied' ? 'is-pending' : state === 'future' ? 'is-future' : '';
				const mark = state === 'goal' ? '✓' : state === 'studied' ? '◐' : state === 'future' ? '' : '·';
				const status = state === 'goal' ? 'đạt mục tiêu' : state === 'studied' ? 'có học' : state === 'future' ? 'chưa tới' : 'nghỉ';
				return <li key={entry.day} aria-label={`${WEEKDAY_LABELS[index]}: ${status}${entry.isToday ? ' (hôm nay)' : ''}`} className={`week-day-tile flex flex-col items-center gap-0.5 py-2 ${tile} ${entry.isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}>
					<span className="text-xs font-bold">{WEEKDAY_LABELS[index]}</span>
					<span aria-hidden="true" className="h-5 text-base font-black leading-5">{mark}</span>
				</li>;
			})}
		</ol>
		<p className="mt-2 text-xs text-muted">✓ đạt mục tiêu · ◐ có học · · ngày nghỉ</p>
	</div>;
}
