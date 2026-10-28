import { expect, it } from 'vitest';
import { buildGuidedQuestions, buildRetryQuestion, REVIEW_KEYS } from '@/lib/english/guidedReview';
import { mulberry32 } from '@/lib/english/activities';
import { bundle } from './fixtures/bundle';
it('cycles through available modes and changes the retry mode', () => { const all = [1,2,3,4,5].map(bundle); const q = buildGuidedQuestions(all, all, mulberry32(7)); expect(q).toHaveLength(5); expect(new Set(q.map((x) => x.activityKey))).toEqual(new Set(REVIEW_KEYS)); expect(buildRetryQuestion(all[0]!, all, 'meaning_choice', mulberry32(2))?.activityKey).not.toBe('meaning_choice'); all.forEach((b) => { b.examples[0]!.role = 'study'; }); expect(buildGuidedQuestions(all, all, mulberry32(7)).every((x) => x.activityKey !== 'cloze_choice')).toBe(true); });
