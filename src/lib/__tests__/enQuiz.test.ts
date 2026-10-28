import { expect, it } from 'vitest';
import { quizItemFor } from '@/lib/english/quiz';
import { mulberry32, poolFromBundles } from '@/lib/english/activities';
import { bundle } from './fixtures/bundle';
it('does not fall back from meaning choice and requires grade examples for fill', () => { const all = [1,2,3,4].map(bundle); const ctx = { pool: poolFromBundles(all), rng: mulberry32(1) }; expect(quizItemFor('mcq', all[0]!, ctx)?.activityKey).toBe('meaning_choice'); expect(quizItemFor('fill', all[0]!, ctx)?.activityKey).toBe('cloze_choice'); all[0]!.examples[0]!.role = 'study'; expect(quizItemFor('fill', all[0]!, ctx)).toBeNull(); expect(quizItemFor('mcq', all[0]!, { ...ctx, pool: poolFromBundles([all[0]!]) })).toBeNull(); });
