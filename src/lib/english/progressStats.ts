/** Pure summaries the progress page draws: weekly accuracy, week-over-week change and this week's XP. */

export type WeekHistory = { start: string; longTerm: number; answers: number; correct: number };
export type WeekDayXp = { day: string; xp: number; studied: boolean; goalMet: boolean; isFuture: boolean };

/** Percent right per week; `null` for a week with no scheduled answers, so charts can show it as empty. */
export function accuracySeries(weeks: WeekHistory[]): Array<{ start: string; percent: number | null; correct: number; answers: number }> {
	return weeks.map((week) => ({
		start: week.start,
		percent: week.answers > 0 ? Math.round((week.correct / week.answers) * 100) : null,
		correct: week.correct,
		answers: week.answers,
	}));
}

/** Change from last week; `null` when either side has nothing to compare. */
export function weekDelta(current: number | null, previous: number | null): number | null {
	return current === null || previous === null ? null : current - previous;
}

export function weekXpSummary(days: WeekDayXp[]): { total: number; studiedDays: number; goalDays: number; best: number } {
	return {
		total: days.reduce((sum, day) => sum + day.xp, 0),
		studiedDays: days.filter((day) => day.studied).length,
		goalDays: days.filter((day) => day.goalMet).length,
		best: Math.max(0, ...days.map((day) => day.xp)),
	};
}

/** "2026-09-07" → "7/9": short enough for eight weekly columns on a phone. */
export function shortDayLabel(day: string): string {
	return `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;
}
