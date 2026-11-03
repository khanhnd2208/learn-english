import { expect, test } from 'vitest';
import { formatVnDay, gradeTestAnswer, isTestPassed, pickBestAttempt, testPercent } from '@/lib/english/testPaper';

const mcq = { type: 'mcq', correctIndex: 1, answers: [] };
const fill = { type: 'fill', correctIndex: null, answers: ['since', 'from'] };

test('grades multiple choice by option index', () => {
  expect(gradeTestAnswer(mcq, '1')).toBe(true);
  expect(gradeTestAnswer(mcq, '0')).toBe(false);
  expect(gradeTestAnswer(mcq, null)).toBe(false);
});
test('grades fill-in against every accepted answer', () => {
  expect(gradeTestAnswer(fill, '  Since ')).toBe(true);
  expect(gradeTestAnswer(fill, 'for')).toBe(false);
  expect(gradeTestAnswer(fill, '')).toBe(false);
});
test('passes from 80%', () => {
  expect(isTestPassed(8, 10)).toBe(true);
  expect(isTestPassed(7, 10)).toBe(false);
  expect(isTestPassed(0, 0)).toBe(false);
});
test('rounds the percent', () => {
  expect(testPercent(2, 3)).toBe(67);
  expect(testPercent(0, 0)).toBe(0);
});
test('prefers the newer attempt on an equal ratio', () => {
  const first = { score: 8, total: 10, finishedAt: new Date('2026-01-01') };
  const second = { score: 4, total: 5, finishedAt: new Date('2026-01-02') };
  expect(pickBestAttempt([first, second])).toBe(second);
});
test('formats a Vietnam day key', () => {
  expect(formatVnDay('2026-11-03')).toBe('03/11/2026');
});
