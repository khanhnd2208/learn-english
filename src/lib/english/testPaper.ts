import { EN_TEST_PASS_PERCENT } from './constants';
import { normalizeLearnerText } from './text';

export type TestQuestionInput =
  | { type: 'mcq'; prompt: string; options: string[]; correctIndex: number; explanationVi: string }
  | { type: 'fill'; prompt: string; answers: string[]; explanationVi: string };

export function gradeTestAnswer(item: { type: string; correctIndex: number | null; answers: string[] }, answer: string | null): boolean {
  if (answer === null || !answer.trim()) return false;
  if (item.type === 'mcq') return answer === String(item.correctIndex);
  if (item.type === 'fill') return item.answers.some((expected) => normalizeLearnerText(answer) === normalizeLearnerText(expected));
  return false;
}
export function isTestPassed(score: number, total: number): boolean { return total > 0 && score * 100 >= total * EN_TEST_PASS_PERCENT; }
export function testPercent(score: number, total: number): number { return total > 0 ? Math.round(score * 100 / total) : 0; }
export function pickBestAttempt<T extends { score: number; total: number; finishedAt: Date }>(attempts: T[]): T | null {
  return attempts.reduce<T | null>((best, item) => {
    if (!best) return item;
    const comparison = item.score * best.total - best.score * item.total;
    return comparison > 0 || (comparison === 0 && item.finishedAt > best.finishedAt) ? item : best;
  }, null);
}
/** `YYYY-MM-DD` (a Vietnam day key) to `DD/MM/YYYY`. */
export function formatVnDay(dayKey: string): string {
  const [year, month, day] = dayKey.split('-');
  return `${day}/${month}/${year}`;
}
