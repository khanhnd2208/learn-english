'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
	interactWithActiveTimer,
	sampleActiveTimer,
	setActiveTimerVisibility,
	startActiveTimer,
	type ActiveTimerState,
} from '@/lib/english/activeTimer';

export function useActiveTimer(running: boolean) {
	const state = useRef<ActiveTimerState | null>(null);

	useEffect(() => {
		if (!running) {
			state.current = null;
			return;
		}
		state.current = startActiveTimer(Date.now(), document.visibilityState === 'visible');
		const interact = () => {
			if (state.current) state.current = interactWithActiveTimer(state.current, Date.now());
		};
		const visibility = () => {
			if (state.current) state.current = setActiveTimerVisibility(state.current, document.visibilityState === 'visible', Date.now());
		};
		window.addEventListener('pointerdown', interact, { passive: true });
		window.addEventListener('keydown', interact);
		document.addEventListener('visibilitychange', visibility);
		return () => {
			window.removeEventListener('pointerdown', interact);
			window.removeEventListener('keydown', interact);
			document.removeEventListener('visibilitychange', visibility);
		};
	}, [running]);

	return useCallback(() => {
		if (!state.current) return 0;
		state.current = sampleActiveTimer(state.current, Date.now());
		return Math.round(state.current.activeMs / 1000);
	}, []);
}
