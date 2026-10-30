import { vnDayKey } from '@/lib/english/gapRule';
import { emptyMetrics, type QuestMetrics } from '@/lib/english/quests';

export type ReviewRow = { at: Date; scheduled: boolean };
export type GuidedRow = { sessionId: string; chunkNumber: number; answered: boolean; answeredAt: Date | null; correct: boolean };
export type XpRow = { day: string; xp: number; kind: string; sourceKey: string };

/** Quest metrics for a set of Vietnam days, from rows already loaded for the week. */
export function periodMetrics(input: {
	days: Set<string>;
	reviews: ReviewRow[];
	guided: GuidedRow[];
	xp: XpRow[];
}): QuestMetrics {
	const metrics = emptyMetrics();
	const reviews = input.reviews.filter((review) => input.days.has(vnDayKey(review.at)));
	const guided = input.guided.filter((row) => row.answeredAt !== null && input.days.has(vnDayKey(row.answeredAt)));
	metrics.srsWords = reviews.filter((review) => review.scheduled).length;
	metrics.daysStudied = new Set([...reviews.map((review) => vnDayKey(review.at)), ...guided.map((row) => vnDayKey(row.answeredAt!))]).size;
	metrics.xp = input.xp.filter((row) => input.days.has(row.day)).reduce((sum, row) => sum + row.xp, 0);
	const chunks = new Map<string, GuidedRow[]>();
	for (const row of input.guided) {
		const key = JSON.stringify([row.sessionId, row.chunkNumber]);
		chunks.set(key, [...(chunks.get(key) ?? []), row]);
	}
	metrics.chunksDone = [...chunks.values()].filter((rows) => rows.every((row) => row.answered && row.answeredAt) && input.days.has(vnDayKey(new Date(Math.max(...rows.map((row) => row.answeredAt!.getTime())))))).length;
	return metrics;
}

/** Per-Vietnam-day totals the reward step reads from SQL instead of every row of the week. */
export type DayTotals = { day: string; srsWords: number; reviewed: number; guidedAnswered: number; chunksDone: number; xp: number };

export type ReviewDayRow = { day: string; reviewed: number; srsWords: number };
export type GuidedDayRow = { kind: 'answer' | 'chunk'; day: string; n: number };
export type XpDayRow = { day: string; xp: number };

/** Joins the three per-day SQL results into one row per day, sorted by day. */
export function mergeDayTotals(reviews: ReviewDayRow[], guided: GuidedDayRow[], xp: XpDayRow[]): DayTotals[] {
	const byDay = new Map<string, DayTotals>();
	const row = (day: string) => {
		let entry = byDay.get(day);
		if (!entry) byDay.set(day, entry = { day, srsWords: 0, reviewed: 0, guidedAnswered: 0, chunksDone: 0, xp: 0 });
		return entry;
	};
	for (const review of reviews) { const entry = row(review.day); entry.reviewed += review.reviewed; entry.srsWords += review.srsWords; }
	for (const item of guided) { const entry = row(item.day); if (item.kind === 'answer') entry.guidedAnswered += item.n; else entry.chunksDone += item.n; }
	for (const item of xp) row(item.day).xp += item.xp;
	return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Same result as `periodMetrics`, from per-day totals. */
export function metricsFromDayTotals(days: Set<string>, totals: DayTotals[]): QuestMetrics {
	const metrics = emptyMetrics();
	for (const total of totals) {
		if (!days.has(total.day)) continue;
		metrics.srsWords += total.srsWords;
		metrics.chunksDone += total.chunksDone;
		metrics.xp += total.xp;
		if (total.reviewed > 0 || total.guidedAnswered > 0) metrics.daysStudied += 1;
	}
	return metrics;
}
