"use client";

import { useEffect, useState } from 'react';

let cached: Promise<boolean> | null = null;

/** Asks once per page load whether the server can speak words that have no recorded file. */
function fetchServerTts(): Promise<boolean> {
	cached ??= fetch('/api/audio/status', { credentials: 'same-origin' })
		.then((response) => response.ok ? response.json() : null)
		.then((body: { ok?: boolean; data?: { serverTts?: boolean } } | null) => body?.ok === true && body.data?.serverTts === true)
		.catch(() => {
			cached = null;
			return false;
		});
	return cached;
}

/** `null` while unknown, then whether `/api/audio` can synthesize speech. */
export function useServerTts(): boolean | null {
	const [value, setValue] = useState<boolean | null>(null);
	useEffect(() => {
		let active = true;
		void fetchServerTts().then((result) => { if (active) setValue(result); });
		return () => { active = false; };
	}, []);
	return value;
}
