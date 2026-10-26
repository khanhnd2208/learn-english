import { describe, expect, it } from 'vitest';
import { masteredSeries, median, recallMedianByWeek, retentionRate } from '@/lib/english/progressMetrics';

const now = new Date('2026-10-22T04:00:00.000Z');

describe('progress metrics', () => {
	it('adds a counted pass and removes a later counted miss', () => {
		const series = masteredSeries([
			{ senseId: 'a', passed: true, createdAt: new Date('2026-10-20T03:00:00.000Z') },
			{ senseId: 'b', passed: true, createdAt: new Date('2026-10-20T05:00:00.000Z') },
			{ senseId: 'a', passed: false, createdAt: new Date('2026-10-21T03:00:00.000Z') },
		], now);
		const day = (key: string) => series.find((point) => point.day === key)?.mastered;
		expect(day('2026-10-20')).toBe(2);
		expect(day('2026-10-21')).toBe(1);
		expect(day('2026-10-22')).toBe(1);
	});

	it('measures retention only across counted pairs', () => {
		const rate = retentionRate([
			{ senseId: 'a', passed: true, createdAt: new Date('2026-10-01T03:00:00.000Z') },
			{ senseId: 'a', passed: true, createdAt: new Date('2026-10-10T03:00:00.000Z') },
			{ senseId: 'b', passed: true, createdAt: new Date('2026-10-02T03:00:00.000Z') },
			{ senseId: 'b', passed: false, createdAt: new Date('2026-10-12T03:00:00.000Z') },
			{ senseId: 'c', passed: false, createdAt: new Date('2026-10-03T03:00:00.000Z') },
			{ senseId: 'c', passed: true, createdAt: new Date('2026-10-13T03:00:00.000Z') },
		], now);
		expect(rate.pairs).toBe(2);
		expect(rate.held).toBe(1);
		expect(rate.rate).toBe(0.5);
	});

	it('takes the median only from correct recall answers', () => {
		expect(median([10, 30, 20])).toBe(20);
		const weeks = recallMedianByWeek([
			{ responseMs: 1000, createdAt: new Date('2026-10-20T03:00:00.000Z') },
			{ responseMs: 3000, createdAt: new Date('2026-10-21T03:00:00.000Z') },
		], now);
		const week = weeks.find((item) => item.medianMs != null);
		expect(week?.medianMs).toBe(2000);
	});
});
