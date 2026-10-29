"use client";

import { useEffect, useState } from 'react';
import { parseServerTtsStatus } from '@/lib/english/audioPlayback';

let cached: Promise<boolean | null> | null = null;

/**
 * Asks whether the server can speak words that have no recorded file. A real answer is kept
 * for the page; an unknown one (server restarting after a deploy, network hiccup) is asked again next time.
 */
function fetchServerTts(): Promise<boolean | null> {
	if (cached) return cached;
	const request: Promise<boolean | null> = fetch('/api/audio/status', { credentials: 'same-origin', cache: 'no-store' })
		.then(async (response) => parseServerTtsStatus(response.ok, await response.json().catch(() => null)))
		.catch(() => null)
		.then((result) => {
			if (result === null && cached === request) cached = null;
			return result;
		});
	cached = request;
	return request;
}

/** `null` while unknown, then whether `/api/audio` can synthesize speech. Unknown means: try the server. */
export function useServerTts(): boolean | null {
	const [value, setValue] = useState<boolean | null>(null);
	useEffect(() => {
		let active = true;
		void fetchServerTts().then((result) => { if (active) setValue(result); });
		return () => { active = false; };
	}, []);
	return value;
}
