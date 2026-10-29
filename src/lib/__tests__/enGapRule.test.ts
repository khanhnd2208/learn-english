import { describe, expect, it } from 'vitest';
import { shiftVnDay, vnDayKey } from '@/lib/english/gapRule';

describe('vnDayKey', () => {
	it('uses the Vietnam calendar across midnight', () => {
		expect(vnDayKey(new Date('2026-10-22T16:59:00.000Z'))).toBe('2026-10-22');
		expect(vnDayKey(new Date('2026-10-22T17:00:00.000Z'))).toBe('2026-10-23');
	});

	it('matches the Asia/Ho_Chi_Minh calendar every 37 minutes across two years', () => {
		const format = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
		for (let at = Date.UTC(2025, 0, 1); at < Date.UTC(2027, 0, 1); at += 37 * 60_000) {
			expect(vnDayKey(new Date(at))).toBe(format.format(at));
		}
	});
});

describe('shiftVnDay', () => {
	it('moves across month and year ends', () => {
		expect(shiftVnDay('2026-10-31', 1)).toBe('2026-11-01');
		expect(shiftVnDay('2027-01-01', -1)).toBe('2026-12-31');
	});
});
