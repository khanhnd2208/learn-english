import { describe, expect, it } from 'vitest';
import { HINTS } from '@/lib/english/hintCopy';
import { HINT_MAX_WIDTH, placeHint } from '@/lib/hintPosition';

const phone = { width: 375, height: 812 };

describe('hint placement', () => {
	it('centres the bubble under its trigger', () => {
		const spot = placeHint({ top: 100, bottom: 120, left: 180, width: 20 }, 80, { width: 1280, height: 800 });
		expect(spot).toEqual({ top: 128, left: 190 - HINT_MAX_WIDTH / 2, width: HINT_MAX_WIDTH });
	});

	it('stays 16px inside both screen edges', () => {
		expect(placeHint({ top: 50, bottom: 70, left: 4, width: 20 }, 80, phone).left).toBe(16);
		const right = placeHint({ top: 50, bottom: 70, left: 350, width: 20 }, 80, phone);
		expect(right.left + right.width).toBe(375 - 16);
	});

	it('narrows to fit a small screen', () => {
		expect(placeHint({ top: 50, bottom: 70, left: 150, width: 20 }, 80, { width: 300, height: 600 }).width).toBe(268);
	});

	it('flips above the trigger when there is no room below', () => {
		expect(placeHint({ top: 760, bottom: 780, left: 150, width: 20 }, 100, phone).top).toBe(652);
	});
});

describe('hint copy', () => {
	it('reads the real schedule and XP values', () => {
		expect(HINTS.srs.body).toContain('1 → 3 → 7 → 21 → 60 ngày');
		expect(HINTS.xp.body).toContain('+20');
		expect(HINTS.stages.body).toContain('21+ ngày');
	});
});
