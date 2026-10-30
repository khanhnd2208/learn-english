import { expect, it } from 'vitest';
import { buildGuidedQuestions, buildRetryQuestion, canBuildGuidedQuestion, REVIEW_KEYS, reviewWeight, weightedOrder } from '@/lib/english/guidedReview';
import { poolFromBundles } from '@/lib/english/activities/distractors';
import { buildGuidedQuestions as legacyQuestions, buildRetryQuestion as legacyRetry } from '@/lib/__dbtests__/legacy/questions';
import { mulberry32 } from '@/lib/english/activities';
import { bundle } from './fixtures/bundle';
it('cycles through available modes and changes the retry mode', () => { const all = [1,2,3,4,5].map(bundle); const q = buildGuidedQuestions(all, poolFromBundles(all), mulberry32(7)); expect(q).toHaveLength(5); expect(new Set(q.map((x) => x.activityKey))).toEqual(new Set(REVIEW_KEYS)); expect(buildRetryQuestion(all[0]!, poolFromBundles(all), 'meaning_choice', mulberry32(2))?.activityKey).not.toBe('meaning_choice'); all.forEach((b) => { b.examples[1]!.role = 'study'; }); expect(buildGuidedQuestions(all, poolFromBundles(all), mulberry32(7)).every((x) => x.activityKey !== 'cloze_choice')).toBe(true); });
it('keeps a selected question mode through main and retry', () => {
	const all = [1,2,3,4,5].map(bundle);
	const pool = poolFromBundles(all);
	for (const mode of REVIEW_KEYS) {
		expect(buildGuidedQuestions(all, pool, mulberry32(7), mode).map((q) => q.activityKey)).toEqual(Array(5).fill(mode));
		expect(buildRetryQuestion(all[0]!, pool, 'meaning_choice', mulberry32(7), mode)?.activityKey).toBe(mode);
	}
	all[0]!.examples[1]!.role = 'study';
	expect(canBuildGuidedQuestion(all[0]!, pool, 'cloze_choice')).toBe(false);
	all[1]!.word.audioPath = '';
	expect(canBuildGuidedQuestion(all[1]!, pool, 'listen_type')).toBe(true);
	expect(canBuildGuidedQuestion(all[2]!, { entries: [] }, 'meaning_choice')).toBe(false);
});
it('weights only SRS mistakes: unseen and well-known words tie, often-missed words come first', () => {
	expect(reviewWeight({ recentWrong: 0, recentTotal: 0 })).toBe(reviewWeight({ recentWrong: 0, recentTotal: 10 }));
	expect(reviewWeight({ recentWrong: 4, recentTotal: 5 })).toBeGreaterThan(reviewWeight({ recentWrong: 1, recentTotal: 5 }));
	const ids = Array.from({ length: 20 }, (_, i) => `s${i}`);
	const hits = Array.from({ length: 200 }, (_, seed) => weightedOrder(ids, [{ senseId: 's7', recentWrong: 5, recentTotal: 5 }], mulberry32(seed)).slice(0, 5).includes('s7')).filter(Boolean).length;
	expect(hits).toBeGreaterThan(100);
});

it('preserves every seeded question, prompt, key and accepted answer using a compact distractor pool', () => {
	const all = Array.from({ length: 30 }, (_, n) => bundle(n + 1));
	const chunk = all.slice(0, 5);
	for (let seed = 0; seed < 100; seed++) {
		expect(buildGuidedQuestions(chunk, poolFromBundles(all), mulberry32(seed))).toEqual(legacyQuestions(chunk, all, mulberry32(seed)));
		expect(buildRetryQuestion(all[0]!, poolFromBundles(all), 'meaning_choice', mulberry32(seed))).toEqual(legacyRetry(all[0]!, all, 'meaning_choice', mulberry32(seed)));
	}
});

it('samples weighted first choices with the expected distribution', () => {
	const stats = [{ senseId: 'b', recentTotal: 6, recentWrong: 1 }, { senseId: 'c', recentTotal: 3, recentWrong: 2 }]; // weights 1, 2, 4
	const counts = new Map<string, number>();
	for (let seed = 0; seed < 20_000; seed++) { const first = weightedOrder(['a','b','c'], stats, mulberry32(seed))[0]!; counts.set(first, (counts.get(first) ?? 0) + 1); }
	for (const [id, weight] of [['a',1], ['b',2], ['c',4]] as const) expect(Math.abs(counts.get(id)! / 20_000 - weight / 7)).toBeLessThan(0.02);
});

it('orders 5000 distinct words in under 50 milliseconds', () => {
	const ids = Array.from({ length: 5000 }, (_, i) => `s${i}`);
	const start = performance.now();
	expect(weightedOrder(ids, [], mulberry32(42))).toHaveLength(5000);
	expect(performance.now() - start).toBeLessThan(50);
});
