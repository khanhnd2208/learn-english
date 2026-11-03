import { expect, it } from 'vitest';
import { courseProgress } from '@/lib/english/testCourse';

it('has nothing to do in an empty course', () => {
  expect(courseProgress([], 80)).toEqual({ passed: 0, total: 0, nextId: null });
});
it('points at the first paper that is not passed yet', () => {
  expect(courseProgress([{ id: 'a', bestPercent: 90 }, { id: 'b', bestPercent: 50 }, { id: 'c', bestPercent: null }], 80)).toEqual({ passed: 1, total: 3, nextId: 'b' });
});
it('counts the exact pass mark as passed', () => {
  expect(courseProgress([{ id: 'a', bestPercent: 80 }], 80)).toEqual({ passed: 1, total: 1, nextId: null });
});
it('starts at the first paper when none was taken', () => {
  expect(courseProgress([{ id: 'a', bestPercent: null }, { id: 'b', bestPercent: null }], 80)).toEqual({ passed: 0, total: 2, nextId: 'a' });
});
