export type PlayFailure = 'blocked' | 'broken';

/**
 * Why `HTMLMediaElement.play()` was rejected. A browser autoplay block (no recent tap)
 * is not a broken file: the learner only needs to tap again.
 */
export function classifyPlayError(error: unknown): PlayFailure {
	const name = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : '';
	return name === 'NotAllowedError' ? 'blocked' : 'broken';
}
