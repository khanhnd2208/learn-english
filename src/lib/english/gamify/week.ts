import { vnDayKey } from '@/lib/english/gapRule';

export function studyDaysThisWeek(events: Date[], now = new Date()): string[] {
	const today = vnDayKey(now);
	const [year, month, day] = today.split('-').map(Number);
	const monday = new Date(Date.UTC(year, month - 1, day));
	monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
	const start = monday.toISOString().slice(0, 10);
	return [...new Set(events.map(vnDayKey).filter((key) => key >= start && key <= today))].sort();
}
