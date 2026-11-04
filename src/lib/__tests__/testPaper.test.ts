import { expect, test } from 'vitest';
import { EN_TEST_MATCH_RULES as all } from '@/lib/english/constants';
import { firstBlankPosition, formatVnDateTime, formatVnDay, gradeTestAnswer, isTestPassed, matchFillAnswer, pickBestAttempt, testAutoAdvanceTarget, testPercent, testReviewCounts, testShowsSubmit } from '@/lib/english/testPaper';

const mcq = { type: 'mcq', correctIndex: 1, answers: [], matchRules: [] as string[] };
const fill = { type: 'fill', correctIndex: null, answers: ['since', 'from'], matchRules: [...all] };

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
test('matches fill answers under the default rules', () => {
  expect(matchFillAnswer('  SINCE. ', 'since', all)).toBe(true);
  expect(matchFillAnswer('sinse', 'since', all)).toBe(false);
  expect(matchFillAnswer('must   not', 'must not', all)).toBe(true);
  expect(matchFillAnswer('alot', 'a lot', all)).toBe(false);
});
test('apostrophes depend on ignore_punctuation', () => {
  expect(matchFillAnswer('mustnt', "mustn't", all)).toBe(true);
  expect(matchFillAnswer('mustnt', "mustn't", all.filter((rule) => rule !== 'ignore_punctuation'))).toBe(false);
});
test('hyphens depend on ignore_hyphen', () => {
  for (const typed of ['well known', 'wellknown', 'well—known']) expect(matchFillAnswer(typed, 'well-known', all)).toBe(true);
  expect(matchFillAnswer('well known', 'well-known', all.filter((rule) => rule !== 'ignore_hyphen'))).toBe(false);
});
test('case matters without ignore_case', () => {
  expect(matchFillAnswer('london', 'London', ['collapse_spaces'])).toBe(false);
});
test('counts review statuses', () => {
  expect(testReviewCounts([{ answer: '1', correct: true }, { answer: '0', correct: false }, { answer: null, correct: false }])).toEqual({ correct: 1, wrong: 1, blank: 1 });
});
test('formats a Vietnam date and time', () => {
  expect(formatVnDateTime(new Date('2026-11-03T17:30:00Z'))).toBe('00:30 · 04/11/2026');
});
test('auto advances only a newly answered nonfinal question', () => {
  expect(testAutoAdvanceTarget({ position: 0, total: 3, wasBlank: true })).toBe(1);
  expect(testAutoAdvanceTarget({ position: 0, total: 3, wasBlank: false })).toBeNull();
  expect(testAutoAdvanceTarget({ position: 2, total: 3, wasBlank: true })).toBeNull();
});
test('finds the first blank answer', () => {
  expect(firstBlankPosition(['1', null, ' ', '2'])).toBe(1);
  expect(firstBlankPosition(['1', '2'])).toBeNull();
});
test('offers submit on the last question or once every question is answered', () => {
  expect(testShowsSubmit({ position: 2, total: 3, answers: ['1', null, null] })).toBe(true);
  expect(testShowsSubmit({ position: 0, total: 3, answers: ['1', 'a', '2'] })).toBe(true);
  expect(testShowsSubmit({ position: 0, total: 3, answers: ['1', null, '2'] })).toBe(false);
});
