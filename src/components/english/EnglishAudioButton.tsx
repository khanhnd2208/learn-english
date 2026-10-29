'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { playEnglishAudio, senseAudioUrl, stopEnglishAudio, type PlaybackState } from '@/lib/englishAudio';
import { useServerTts } from '@/lib/useServerTts';

/**
 * Speaker for one word. Every tap plays the word from the start: the server file first
 * (recorded or voiced by the server), browser speech when that file cannot play.
 */
export default function EnglishAudioButton({
	senseId,
	lemma = '',
	recordedAudioAvailable = false,
	autoPlay = false,
	compact = false,
}: {
	senseId: string;
	lemma?: string;
	recordedAudioAvailable?: boolean;
	/** Play once on mount. Only use right after a learner gesture, or browsers block it. */
	autoPlay?: boolean;
	compact?: boolean;
}) {
	const serverTts = useServerTts();
	const [state, setState] = useState<PlaybackState>('idle');
	const owner = useRef({});
	const autoPlayed = useRef(false);

	function play() {
		if (state === 'loading') return;
		// Only a server that said it cannot speak skips the file; unknown still tries it.
		const url = recordedAudioAvailable || serverTts !== false ? senseAudioUrl(senseId) : null;
		playEnglishAudio({ url, text: lemma, owner: owner.current, onState: setState });
	}

	useEffect(() => {
		const self = owner.current;
		return () => stopEnglishAudio(self);
	}, []);

	useEffect(() => {
		if (!autoPlay || autoPlayed.current) return;
		autoPlayed.current = true;
		const timer = setTimeout(play, 0);
		return () => clearTimeout(timer);
	// eslint-disable-next-line react-hooks/exhaustive-deps -- play once on mount
	}, [autoPlay]);

	const busy = state === 'loading' || state === 'playing';
	const icon = state === 'loading' ? 'progress_activity' : state === 'playing' ? 'graphic_eq' : state === 'failed' ? 'volume_off' : 'volume_up';
	const note = state === 'blocked' ? 'Bấm để nghe' : state === 'failed' ? 'Không phát được' : '';
	if (compact) {
		const button = <button type="button" onClick={play} aria-busy={state === 'loading'} aria-label={`Nghe phát âm ${lemma}`} title={state === 'failed' ? 'Không phát được — kiểm tra âm lượng/công tắc im lặng' : 'Nghe phát âm'} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent transition hover:border-accent hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${busy || state === 'blocked' ? 'border-accent bg-accent-subtle' : ''} ${state === 'blocked' ? 'animate-pulse motion-reduce:animate-none' : ''}`}><MaterialIcon name={icon} size={22} className={state === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''} /></button>;
		if (!note) return button;
		return <span className="inline-flex shrink-0 flex-col items-center gap-0.5">{button}<span role="status" className={`text-xs font-bold leading-none ${state === 'blocked' ? 'text-accent' : 'text-warning'}`}>{note}</span></span>;
	}
	return <div className="space-y-1"><Button type="button" variant="secondary" onClick={play} aria-busy={state === 'loading'} leftIcon={<MaterialIcon name={icon} size={20} className={state === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''} />}>Nghe phát âm</Button>{note && <p role="status" className={`text-xs font-bold ${state === 'blocked' ? 'text-accent' : 'text-warning'}`}>{note}</p>}</div>;
}
