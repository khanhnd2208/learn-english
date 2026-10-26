import { describe, expect, it } from 'vitest';
import { applyPracticeExposure, applyTestResult, emptyWordState } from '@/lib/english/wordState';

const now = new Date('2026-10-23T03:00:00.000Z');

describe('applyTestResult', () => {
	it('masters a counted pass and clears the mistake book', () => {
		const next = applyTestResult({ ...emptyWordState(), inMistakeBook: true, mistakeAddedAt: now }, { passed: true, counted: true }, now);
		expect(next.status).toBe('mastered');
		expect(next.masteredAt).toBe(now);
		expect(next.inMistakeBook).toBe(false);
		expect(next.lastTestedAt).toBe(now);
	});

	it('keeps status and the mistake book when a pass is not counted', () => {
		const current = { ...emptyWordState(), status: 'practicing' as const, inMistakeBook: true, mistakeAddedAt: now };
		const next = applyTestResult(current, { passed: true, counted: false }, now);
		expect(next.status).toBe('practicing');
		expect(next.inMistakeBook).toBe(true);
		expect(next.mistakeAddedAt).toBe(now);
	});

	it('sends a counted miss back to practicing and into the mistake book', () => {
		const next = applyTestResult({ ...emptyWordState(), status: 'mastered', masteredAt: now }, { passed: false, counted: true }, now);
		expect(next.status).toBe('practicing');
		expect(next.masteredAt).toBeNull();
		expect(next.inMistakeBook).toBe(true);
		expect(next.mistakeAddedAt).toBe(now);
	});

	it('adds an uncounted miss to the book without changing status', () => {
		const next = applyTestResult({ ...emptyWordState(), status: 'mastered', masteredAt: now }, { passed: false, counted: false }, now);
		expect(next.status).toBe('mastered');
		expect(next.masteredAt).toBe(now);
		expect(next.inMistakeBook).toBe(true);
	});

	it('moves a new word to practicing', () => {
		expect(applyTestResult(emptyWordState(), { passed: false, counted: false }, now).status).toBe('practicing');
		expect(applyPracticeExposure(emptyWordState(), now).status).toBe('practicing');
	});
});
