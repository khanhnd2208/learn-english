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

/** Whole Vietnam calendar days from `earlier` to `later`. Negative when `later` is before `earlier`. */
export function vnDayDistance(earlier: string, later: string): number {
	const [ay, am, ad] = earlier.split('-').map(Number);
	const [by, bm, bd] = later.split('-').map(Number);
	const a = Date.UTC(ay ?? 1970, (am ?? 1) - 1, ad ?? 1);
	const b = Date.UTC(by ?? 1970, (bm ?? 1) - 1, bd ?? 1);
	return Math.round((b - a) / 86_400_000);
}

/**
 * A test counts toward "Đã nắm" when the learner has never met the word,
 * or the Vietnam calendar gap is at least `minGapDays`.
 */
export function isCounted(priorExposureAt: Date | null, testStartedAt: Date, minGapDays: number): boolean {
	if (!priorExposureAt) return true;
	return vnDayDistance(vnDayKey(priorExposureAt), vnDayKey(testStartedAt)) >= minGapDays;
}
