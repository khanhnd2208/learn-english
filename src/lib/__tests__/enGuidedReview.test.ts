import { expect, it } from 'vitest';
import { buildGuidedQuestions, buildRetryQuestion, REVIEW_KEYS, reviewWeight, weightedOrder } from '@/lib/english/guidedReview';
import { mulberry32 } from '@/lib/english/activities';
import { bundle } from './fixtures/bundle';
it('cycles through available modes and changes the retry mode', () => { const all = [1,2,3,4,5].map(bundle); const q = buildGuidedQuestions(all, all, mulberry32(7)); expect(q).toHaveLength(5); expect(new Set(q.map((x) => x.activityKey))).toEqual(new Set(REVIEW_KEYS)); expect(buildRetryQuestion(all[0]!, all, 'meaning_choice', mulberry32(2))?.activityKey).not.toBe('meaning_choice'); all.forEach((b) => { b.examples[1]!.role = 'study'; }); expect(buildGuidedQuestions(all, all, mulberry32(7)).every((x) => x.activityKey !== 'cloze_choice')).toBe(true); });
it('weights only SRS mistakes: unseen and well-known words tie, often-missed words come first', () => {
	expect(reviewWeight({ recentWrong: 0, recentTotal: 0 })).toBe(reviewWeight({ recentWrong: 0, recentTotal: 10 }));
	expect(reviewWeight({ recentWrong: 4, recentTotal: 5 })).toBeGreaterThan(reviewWeight({ recentWrong: 1, recentTotal: 5 }));
	const ids = Array.from({ length: 20 }, (_, i) => `s${i}`);
	const hits = Array.from({ length: 200 }, (_, seed) => weightedOrder(ids, [{ senseId: 's7', recentWrong: 5, recentTotal: 5 }], mulberry32(seed)).slice(0, 5).includes('s7')).filter(Boolean).length;
	expect(hits).toBeGreaterThan(100);
});
