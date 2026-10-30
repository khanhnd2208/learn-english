import { answerLayout, type AnswerLayout } from '@/lib/english/answerLayout';
import { activityByKey, type ActivityItem, type ActivityKey } from '@/lib/english/activities';
import type { DistractorPool } from '@/lib/english/activities/distractors';
import { mulberry32, type Rng } from '@/lib/english/activities/rng';
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
	return [...new Set(senseIds)]
		.map((senseId) => ({ senseId, key: rng.next() ** (1 / reviewWeight(stats.get(senseId) ?? { recentWrong: 0, recentTotal: 0 })) }))
		.sort((a, b) => b.key - a.key)
		.map((entry) => entry.senseId);
}

export const REVIEW_KEYS: ActivityKey[] = ['meaning_choice', 'cloze_choice', 'listen_type'];
export type GuidedQuestionMode = 'mix' | ActivityKey;
export const GUIDED_MODE_LABEL: Record<string, string> = { mix: 'Trộn lẫn', meaning_choice: 'Chọn nghĩa', cloze_choice: 'Điền câu', listen_type: 'Nghe viết' };
function buildOne(bundle: SenseBundle, pool: DistractorPool, keys: ActivityKey[], rng: Rng): GuidedQuestion | null {
 for (const key of keys) {
  const item = activityByKey(key)?.build(bundle, { pool, rng, allowSyntheticAudio: true });
  if (item) return { ...item, layout: item.activityKey === 'listen_type' ? answerLayout(item.answerKey) : null };
 }
 return null;
}
export function canBuildGuidedQuestion(bundle: SenseBundle, pool: DistractorPool, mode: GuidedQuestionMode): boolean {
 return Boolean(buildOne(bundle, pool, mode === 'mix' ? REVIEW_KEYS : [mode], mulberry32(0)));
}
export function buildGuidedQuestions(chunk: SenseBundle[], pool: DistractorPool, rng: Rng, mode: GuidedQuestionMode = 'mix'): GuidedQuestion[] {
 const start = Math.floor(rng.next() * REVIEW_KEYS.length);
 const built = chunk.flatMap((bundle, i) => {
  const keys = mode === 'mix' ? REVIEW_KEYS.map((_, j) => REVIEW_KEYS[(start + i + j) % REVIEW_KEYS.length]!) : [mode];
  const question = buildOne(bundle, pool, keys, rng);
  return question ? [question] : [];
 });
 const shuffled = rng.shuffle(built);
 const lastStudied = chunk.at(-1)?.sense.id;
 if (shuffled.length > 1 && shuffled[0]?.senseId === lastStudied) [shuffled[0], shuffled[1]] = [shuffled[1]!, shuffled[0]!];
 return shuffled;
}
export function buildRetryQuestion(bundle: SenseBundle, pool: DistractorPool, previousKey: string, rng: Rng, mode: GuidedQuestionMode = 'mix'): GuidedQuestion | null {
 if (mode !== 'mix') return buildOne(bundle, pool, [mode], rng);
 const other = rng.shuffle(REVIEW_KEYS.filter((key) => key !== previousKey));
 return buildOne(bundle, pool, [...other, ...REVIEW_KEYS.filter((key) => key === previousKey)], rng);
}
