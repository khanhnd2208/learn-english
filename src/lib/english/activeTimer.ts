export const ACTIVE_IDLE_LIMIT_MS = 60_000;

export interface ActiveTimerState {
	activeMs: number;
	lastSampleAt: number;
	lastInteractionAt: number;
	visible: boolean;
}

export function startActiveTimer(now: number, visible = true): ActiveTimerState {
	return { activeMs: 0, lastSampleAt: now, lastInteractionAt: now, visible };
}

export function sampleActiveTimer(state: ActiveTimerState, now: number): ActiveTimerState {
	const elapsed = Math.max(0, now - state.lastSampleAt);
	const activeUntil = Math.min(now, state.lastInteractionAt + ACTIVE_IDLE_LIMIT_MS);
	const activeElapsed = state.visible ? Math.max(0, activeUntil - state.lastSampleAt) : 0;
	return { ...state, activeMs: state.activeMs + Math.min(elapsed, activeElapsed), lastSampleAt: now };
}

export function interactWithActiveTimer(state: ActiveTimerState, now: number): ActiveTimerState {
	const sampled = sampleActiveTimer(state, now);
	return { ...sampled, lastInteractionAt: now };
}

export function setActiveTimerVisibility(state: ActiveTimerState, visible: boolean, now: number): ActiveTimerState {
	const sampled = sampleActiveTimer(state, now);
	return { ...sampled, visible, lastInteractionAt: visible ? now : sampled.lastInteractionAt };
}
