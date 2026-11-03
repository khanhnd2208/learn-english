import { expect, test } from 'vitest';
import { modeOfPath, modeRedirect } from '@/lib/appMode';

test.each([
  ['/tests', 'test'], ['/tests/results/abc', 'test'], ['/admin/tests', 'test'],
  ['/', 'vocab'], ['/admin', 'vocab'], ['/sets/x/test', 'vocab'], ['/testsx', 'vocab'],
])('mode of %s is %s', (path, mode) => { expect(modeOfPath(path)).toBe(mode); });

test('sends the root to the remembered mode', () => {
  expect(modeRedirect('/', null, 'test')).toBe('/tests');
  expect(modeRedirect('/', 'vocab', 'test')).toBe('/');
  expect(modeRedirect('/', null, 'vocab')).toBeNull();
  expect(modeRedirect('/', null, undefined)).toBeNull();
  expect(modeRedirect('/review', null, 'test')).toBeNull();
});
