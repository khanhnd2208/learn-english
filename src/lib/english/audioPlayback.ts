export type PlayFailure = 'blocked' | 'broken';

/**
 * Why `HTMLMediaElement.play()` was rejected. A browser autoplay block (no recent tap)
 * is not a broken file: the learner only needs to tap again.
 */
export function classifyPlayError(error: unknown): PlayFailure {
	const name = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : '';
	return name === 'NotAllowedError' ? 'blocked' : 'broken';
}

/**
 * Reads `/api/audio/status`. Only a real answer from the app counts: a 502 while the server
 * restarts after a deploy, a login redirect or a malformed body is `null` (unknown), so one
 * bad moment never switches word audio off for the rest of the page.
 */
export function parseServerTtsStatus(responseOk: boolean, body: unknown): boolean | null {
	if (!responseOk || typeof body !== 'object' || body === null) return null;
	const { ok, data } = body as { ok?: unknown; data?: { serverTts?: unknown } };
	if (ok !== true || typeof data?.serverTts !== 'boolean') return null;
	return data.serverTts;
}

type VoiceLike = { lang: string; localService: boolean };

/**
 * The voice for browser speech. Voices installed on the device come first: network voices
 * (Chrome's "Google US English") often stay silent or stop, which made the word button fail
 * where the sentence button, using the default voice, still spoke.
 */
export function pickSpeechVoice<T extends VoiceLike>(voices: readonly T[], lang: string): T | undefined {
	const wanted = lang.toLowerCase();
	const base = wanted.split('-')[0] ?? wanted;
	const exact = (voice: T) => voice.lang.toLowerCase().replace('_', '-') === wanted;
	const sameLanguage = (voice: T) => voice.lang.toLowerCase().startsWith(base);
	return voices.find((voice) => voice.localService && exact(voice))
		?? voices.find((voice) => voice.localService && sameLanguage(voice))
		?? voices.find(exact)
		?? voices.find(sameLanguage);
}
