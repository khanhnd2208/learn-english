import { shiftVnDay, vnDayKey } from '@/lib/english/gapRule';

export interface CountedWordResult {
	senseId: string;
	passed: boolean;
	createdAt: Date;
}

export interface RecallTiming {
	responseMs: number;
	createdAt: Date;
}

export interface StudySpan {
	startedAt: Date;
	seconds: number;
}

export function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[mid] ?? null;
	return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function weekStart(day: string): string {
	const [year, month, date] = day.split('-').map(Number);
	const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
	const weekday = utc.getUTCDay();
	const delta = weekday === 0 ? -6 : 1 - weekday;
	return shiftVnDay(day, delta);
}

/** Running count of mastered senses. A counted pass adds one; a counted miss removes one, floored at zero per sense. */
export function masteredSeries(results: CountedWordResult[], now: Date, days = 90): Array<{ day: string; mastered: number }> {
	const sorted = [...results].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	const tally = new Map<string, number>();
	const endOfDay = new Map<string, number>();
	for (const result of sorted) {
		const current = tally.get(result.senseId) ?? 0;
		tally.set(result.senseId, Math.max(0, current + (result.passed ? 1 : -1)));
		let total = 0;
		for (const value of tally.values()) total += value;
		endOfDay.set(vnDayKey(result.createdAt), total);
	}
	const today = vnDayKey(now);
	const firstDay = shiftVnDay(today, -(days - 1));
	let carried = 0;
	for (const [day, total] of [...endOfDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
		if (day < firstDay) carried = total;
	}
	const series: Array<{ day: string; mastered: number }> = [];
	for (let offset = days - 1; offset >= 0; offset -= 1) {
		const day = shiftVnDay(today, -offset);
		if (endOfDay.has(day)) carried = endOfDay.get(day) ?? carried;
		series.push({ day, mastered: carried });
	}
	return series;
}

/** Share of counted passes whose next counted result for the same sense is also a pass. */
export function retentionRate(results: CountedWordResult[], now: Date, days = 90): { pairs: number; held: number; rate: number | null } {
	const start = shiftVnDay(vnDayKey(now), -(days - 1));
	const grouped = new Map<string, CountedWordResult[]>();
	for (const result of results) {
		if (vnDayKey(result.createdAt) < start) continue;
		const list = grouped.get(result.senseId) ?? [];
		list.push(result);
		grouped.set(result.senseId, list);
	}
	let pairs = 0;
	let held = 0;
	for (const list of grouped.values()) {
		list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		for (let index = 0; index < list.length - 1; index += 1) {
			if (!list[index]?.passed) continue;
			pairs += 1;
			if (list[index + 1]?.passed) held += 1;
		}
	}
	return { pairs, held, rate: pairs === 0 ? null : held / pairs };
}

export function recallMedianByWeek(timings: RecallTiming[], now: Date, weeks = 8): Array<{ week: string; medianMs: number | null }> {
	const today = vnDayKey(now);
	const currentWeek = weekStart(today);
	const keys = Array.from({ length: weeks }, (_, index) => shiftVnDay(currentWeek, (index - (weeks - 1)) * 7));
	const buckets = new Map<string, number[]>(keys.map((key) => [key, []]));
	for (const timing of timings) {
		const key = weekStart(vnDayKey(timing.createdAt));
		const bucket = buckets.get(key);
		if (bucket) bucket.push(timing.responseMs);
	}
	return keys.map((week) => ({ week, medianMs: median(buckets.get(week) ?? []) }));
}

export function studySecondsByWeek(spans: StudySpan[], now: Date, weeks = 8): Array<{ week: string; seconds: number }> {
	const today = vnDayKey(now);
	const currentWeek = weekStart(today);
	const keys = Array.from({ length: weeks }, (_, index) => shiftVnDay(currentWeek, (index - (weeks - 1)) * 7));
	const totals = new Map<string, number>(keys.map((key) => [key, 0]));
	for (const span of spans) {
		const key = weekStart(vnDayKey(span.startedAt));
		if (!totals.has(key)) continue;
		totals.set(key, (totals.get(key) ?? 0) + Math.max(0, span.seconds));
	}
	return keys.map((week) => ({ week, seconds: totals.get(week) ?? 0 }));
}
