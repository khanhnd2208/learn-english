"use client";

import { useEffect } from 'react';
import { cardExampleOf, type SenseBundle } from '@/lib/english/senseBundle';
import { exampleAudioUrl, preloadEnglishAudio, senseAudioUrl } from '@/lib/englishAudio';
import { useServerTts } from '@/lib/useServerTts';

/**
 * Download the word audio (and card-sentence audio, unless `sentences` is false) of a session
 * as soon as it opens, in study order.
 */
export function useAudioPreload(bundles: SenseBundle[], { sentences = true }: { sentences?: boolean } = {}): void {
	const serverTts = useServerTts();
	const key = bundles.map((bundle) => bundle.sense.id).join(',');
	useEffect(() => {
		if (serverTts === null) return;
		preloadEnglishAudio(bundles.flatMap((bundle) => {
			const example = serverTts && sentences ? cardExampleOf(bundle.examples) : null;
			return [
				...(serverTts || bundle.word.audioPath.trim() ? [senseAudioUrl(bundle.sense.id)] : []),
				...(example ? [exampleAudioUrl(example.id)] : []),
			];
		}));
	// eslint-disable-next-line react-hooks/exhaustive-deps -- `key` names the bundles
	}, [key, serverTts, sentences]);
}
