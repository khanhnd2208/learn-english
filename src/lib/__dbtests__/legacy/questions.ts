// Frozen copy used only as a parity oracle. Do not edit.
import { answerLayout, type AnswerLayout } from '@/lib/english/answerLayout';
import { activityByKey, poolFromBundles, type ActivityItem, type ActivityKey } from '@/lib/english/activities';
import type { Rng } from '@/lib/english/activities/rng';
import type { SenseBundle } from '@/lib/english/senseBundle';

/** Recent first-attempt results of a word in Ôn luân phiên (SRS). */
export type ReviewHistory = { senseId: string; recentWrong: number; recentTotal: number };
export type GuidedQuestion = ActivityItem & { layout: AnswerLayout | null };

/** Random pick with a boost only for words often missed in SRS; unseen words weigh the same as well-known ones. */
export function reviewWeight(history: Pick<ReviewHistory, 'recentWrong' | 'recentTotal'>): number {
	const wrongRate = history.recentTotal > 0 ? history.recentWrong / history.recentTotal : 0;
	return 1 + 3 * wrongRate + 0.5 * Math.min(4, Math.max(0, history.recentWrong));
}

export function weightedOrder(senseIds: string[], histories: ReviewHistory[], rng: Rng): string[] {
	const stats = new Map(histories.map((history) => [history.senseId, history]));
	const remaining = rng.shuffle([...new Set(senseIds)]);
	const ordered: string[] = [];
	while (remaining.length) {
		const weights = remaining.map((senseId) => reviewWeight(stats.get(senseId) ?? { recentWrong: 0, recentTotal: 0 }));
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		let cursor = rng.next() * total;
		let picked = 0;
		for (let index = 0; index < weights.length; index += 1) {
			cursor -= weights[index]!;
			if (cursor <= 0) { picked = index; break; }
		}
		ordered.push(remaining.splice(picked, 1)[0]!);
	}
	return ordered;
}

export const REVIEW_KEYS: ActivityKey[] = ['meaning_choice', 'cloze_choice', 'listen_type'];
function buildOne(bundle: SenseBundle, bundles: SenseBundle[], keys: ActivityKey[], rng: Rng): GuidedQuestion | null {
 const pool = poolFromBundles(bundles, { sameSetIds: new Set(bundles.map((entry) => entry.sense.id)) });
 for (const key of keys) {
  const item = activityByKey(key)?.build(bundle, { pool, rng, allowSyntheticAudio: true });
  if (item) return { ...item, layout: item.activityKey === 'listen_type' ? answerLayout(item.answerKey) : null };
 }
 return null;
}
export function buildGuidedQuestions(chunk: SenseBundle[], poolBundles: SenseBundle[], rng: Rng): GuidedQuestion[] {
 const start = Math.floor(rng.next() * REVIEW_KEYS.length);
 const built = chunk.flatMap((bundle, i) => {
  const keys = REVIEW_KEYS.map((_, j) => REVIEW_KEYS[(start + i + j) % REVIEW_KEYS.length]!);
  const question = buildOne(bundle, poolBundles, keys, rng);
  return question ? [question] : [];
 });
 const shuffled = rng.shuffle(built);
 const lastStudied = chunk.at(-1)?.sense.id;
 if (shuffled.length > 1 && shuffled[0]?.senseId === lastStudied) [shuffled[0], shuffled[1]] = [shuffled[1]!, shuffled[0]!];
 return shuffled;
}
export function buildRetryQuestion(bundle: SenseBundle, poolBundles: SenseBundle[], previousKey: string, rng: Rng): GuidedQuestion | null {
 const other = rng.shuffle(REVIEW_KEYS.filter((key) => key !== previousKey));
 return buildOne(bundle, poolBundles, [...other, ...REVIEW_KEYS.filter((key) => key === previousKey)], rng);
}
