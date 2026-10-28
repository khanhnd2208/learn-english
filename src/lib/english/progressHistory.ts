import { shiftVnDay, vnWeekDays } from '@/lib/english/gapRule';
import { vnDayStart } from '@/lib/english/schedule';

type State = { senseId: string; box: number };
type Review = { senseId: string; at: Date; correct: boolean; scheduled: boolean; boxBefore: number };

/** Rewind scheduled changes from current states at the end of each Vietnam calendar week. */
export function weeklyProgress(states: State[], reviews: Review[], today: string, now: Date) {
 const monday = vnWeekDays(today)[0]!;
 const rows = [...reviews].sort((a, b) => b.at.getTime() - a.at.getTime());
 const boxes = new Map(states.map((state) => [state.senseId, state.box]));
 let cursor = 0;
 return Array.from({ length: 8 }, (_, i) => shiftVnDay(monday, -7 * i)).map((start, i) => {
  const end = i === 0 ? now : vnDayStart(shiftVnDay(start, 7));
  while (cursor < rows.length && rows[cursor]!.at >= end) {
   const review = rows[cursor++]!;
   if (review.scheduled && boxes.has(review.senseId)) boxes.set(review.senseId, review.boxBefore);
  }
  const weekRows = rows.filter((row) => row.at >= vnDayStart(start) && row.at < end);
  return { start, longTerm: [...boxes.values()].filter((box) => box >= 4).length, answers: weekRows.length, correct: weekRows.filter((row) => row.correct).length };
 }).reverse();
}
