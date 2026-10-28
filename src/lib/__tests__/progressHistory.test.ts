import { describe, expect, it } from 'vitest';
import { weeklyProgress } from '@/lib/english/progressHistory';

describe('weekly progress history', () => {
 it('rewinds scheduled transitions while counting answers by Vietnam week', () => {
  const weeks = weeklyProgress([{ senseId: 'a', box: 4 }, { senseId: 'b', box: 2 }], [
   { senseId: 'a', at: new Date('2026-10-27T08:00:00Z'), boxBefore: 3, correct: true, scheduled: true },
   { senseId: 'b', at: new Date('2026-10-27T09:00:00Z'), boxBefore: 4, correct: false, scheduled: false },
   { senseId: 'a', at: new Date('2026-10-19T08:00:00Z'), boxBefore: 2, correct: false, scheduled: true },
  ], '2026-10-28', new Date('2026-10-28T05:00:00Z'));
  expect(weeks.at(-1)).toMatchObject({ longTerm: 1, answers: 2, correct: 1 });
  expect(weeks.at(-2)).toMatchObject({ longTerm: 0, answers: 1, correct: 0 });
  expect(weeks.at(-3)?.longTerm).toBe(0);
 });
});
