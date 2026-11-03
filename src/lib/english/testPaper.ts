import { EN_TEST_PASS_PERCENT } from './constants';
import { vnDayKey } from './gapRule';

export type TestQuestionInput =
  | { type: 'mcq'; prompt: string; options: string[]; correctIndex: number; explanationVi: string }
  | { type: 'fill'; prompt: string; answers: string[]; explanationVi: string };

const HYPHENS = /[-‐‑–—]/g;

/** Compares a typed answer with an expected one under the question's match rules. */
export function matchFillAnswer(answer: string, expected: string, rules: readonly string[]): boolean {
  const forms = (raw: string): string[] => {
    let value = raw.trim();
    if (rules.includes('ignore_case')) value = value.toLowerCase();
    if (rules.includes('ignore_punctuation')) value = value.replace(/[.,!?;:'"“”‘’]/g, '');
    const variants = rules.includes('ignore_hyphen') && HYPHENS.test(value) ? [value.replace(HYPHENS, ' '), value.replace(HYPHENS, '')] : [value];
    HYPHENS.lastIndex = 0;
    return variants.map((variant) => (rules.includes('collapse_spaces') ? variant.replace(/\s+/g, ' ').trim() : variant));
  };
  const expectedForms = forms(expected);
  return forms(answer).some((form) => expectedForms.includes(form));
}

export function gradeTestAnswer(item: { type: string; correctIndex: number | null; answers: string[]; matchRules: string[] }, answer: string | null): boolean {
  if (answer === null || !answer.trim()) return false;
  if (item.type === 'mcq') return answer === String(item.correctIndex);
  if (item.type === 'fill') return item.answers.some((expected) => matchFillAnswer(answer, expected, item.matchRules));
  return false;
}
export type TestReviewStatus = 'correct' | 'wrong' | 'blank';
export function testReviewStatus(item: { answer: string | null; correct: boolean }): TestReviewStatus {
  if (item.answer === null) return 'blank';
  return item.correct ? 'correct' : 'wrong';
}
export function testReviewCounts(items: Array<{ answer: string | null; correct: boolean }>): { correct: number; wrong: number; blank: number } {
  const counts = { correct: 0, wrong: 0, blank: 0 };
  for (const item of items) counts[testReviewStatus(item)] += 1;
  return counts;
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
/** `HH:mm · DD/MM/YYYY` in Vietnam time. */
export function formatVnDateTime(date: Date): string {
  return `${new Date(date.getTime() + 7 * 3600_000).toISOString().slice(11, 16)} · ${formatVnDay(vnDayKey(date))}`;
}
