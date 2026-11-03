import { expect, it } from 'vitest';
import { isTestNavActive } from '@/config/testNavigation';
import { modeOfPath } from '@/lib/appMode';

it('lights the right test nav item', () => {
  expect(isTestNavActive('/tests/papers/abc', '/tests')).toBe(false);
  expect(isTestNavActive('/tests/subjects/x', '/tests')).toBe(true);
  expect(isTestNavActive('/tests/papers', '/tests/papers')).toBe(true);
  expect(isTestNavActive('/tests/results/a1', '/tests/results')).toBe(true);
  expect(isTestNavActive('/admin/tests/papers', '/admin/tests')).toBe(false);
});
it('treats the admin papers page as test mode', () => {
  expect(modeOfPath('/admin/tests/papers')).toBe('test');
});
