import { describe, expect, it } from 'vitest';
import { interactWithActiveTimer, sampleActiveTimer, setActiveTimerVisibility, startActiveTimer } from '@/lib/english/activeTimer';

describe('English active timer', () => {
	it('counts interaction time but caps an idle stretch at 60 seconds', () => {
		let state = startActiveTimer(0);
		state = sampleActiveTimer(state, 10_000);
		state = sampleActiveTimer(state, 120_000);
		expect(state.activeMs).toBe(60_000);
	});

	it('resumes from a fresh interaction and ignores hidden time', () => {
		let state = startActiveTimer(0);
		state = interactWithActiveTimer(state, 20_000);
		state = setActiveTimerVisibility(state, false, 30_000);
		state = setActiveTimerVisibility(state, true, 90_000);
		state = sampleActiveTimer(state, 100_000);
		expect(state.activeMs).toBe(40_000);
	});
});
