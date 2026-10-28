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
