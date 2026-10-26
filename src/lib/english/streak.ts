import { shiftVnDay, vnWeekDays } from '@/lib/english/gapRule';

/**
 * Study streaks over Vietnam days. One missed day per Monday-first week is a free rest day:
 * it keeps the streak alive but does not add to it. Today never breaks a streak, since it is not over yet.
 */
export function streakStats(studied: Set<string>, today: string): { current: number; longest: number } {
	const first = [...studied].filter((day) => day <= today).sort()[0];
	if (!first) return { current: 0, longest: 0 };
	let run = 0;
	let longest = 0;
	let previousStudied = false;
	const restWeeks = new Set<string>();
	for (let day = first; day < today; day = shiftVnDay(day, 1)) {
		if (studied.has(day)) {
			run += 1;
			previousStudied = true;
		} else {
			const week = vnWeekDays(day)[0]!;
			if (run > 0 && previousStudied && !restWeeks.has(week)) restWeeks.add(week);
			else {
				run = 0;
				restWeeks.clear();
			}
			previousStudied = false;
		}
		longest = Math.max(longest, run);
	}
	if (studied.has(today)) run += 1;
	return { current: run, longest: Math.max(longest, run) };
}

export function currentStreak(studied: Set<string>, today: string): number {
	return streakStats(studied, today).current;
}
