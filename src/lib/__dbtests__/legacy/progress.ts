// Frozen copy used only as a parity oracle. Do not edit.
import { prisma } from '@/lib/prisma';
import { shiftVnDay, vnDayKey, vnWeekDays } from '@/lib/english/gapRule';
import { vnDayStart } from './schedule';
import { weeklyProgress } from '@/lib/english/progressHistory';

/** History is reconstructed from recorded scheduled transitions, not XP awards. */
export async function getProgressHistory(userId: string, now = new Date()) {
 const today = vnDayKey(now);
 const monday = vnWeekDays(today)[0]!;
 const first = shiftVnDay(monday, -49);
 const [states, reviews] = await Promise.all([
  prisma.enWordState.findMany({ where: { userId }, select: { senseId: true, box: true } }),
  prisma.enReview.findMany({ where: { userId, at: { gte: vnDayStart(first) } }, orderBy: { at: 'desc' }, select: { senseId: true, at: true, correct: true, scheduled: true, boxBefore: true, boxAfter: true } }),
 ]);
 const wrongCounts = new Map<string, number>();
 for (const row of reviews) if (!row.correct) wrongCounts.set(row.senseId, (wrongCounts.get(row.senseId) ?? 0) + 1);
 const top = [...wrongCounts].sort((a, b) => b[1] - a[1]).slice(0, 5);
 const senses = await prisma.enSense.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, meaningVi: true, word: { select: { lemma: true } } } });
 const byId = new Map(senses.map((sense) => [sense.id, sense]));
 const weeks = weeklyProgress(states, reviews, today, now);
 return { weeks, wrong: top.flatMap(([id, count]) => { const sense = byId.get(id); return sense ? [{ id, count, lemma: sense.word.lemma, meaning: sense.meaningVi }] : []; }) };
}
