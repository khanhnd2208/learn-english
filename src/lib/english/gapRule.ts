import { studyDayKey } from '@/lib/english/text';

/** Calendar day in Asia/Ho_Chi_Minh, `YYYY-MM-DD`. */
export function vnDayKey(date: Date): string {
	return studyDayKey(date);
}

export function shiftVnDay(day: string, delta: number): string {
	const [year, month, date] = day.split('-').map(Number);
	const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (date ?? 1) + delta));
	return utc.toISOString().slice(0, 10);
}
