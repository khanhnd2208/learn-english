'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useSpeech } from '@/lib/useSpeech';

export default function EnglishAudioButton({
	senseId,
	lemma = '',
	allowTts = true,
	recordedAudioAvailable = false,
	autoPlay = false,
	compact = false,
}: {
	senseId: string;
	lemma?: string;
	allowTts?: boolean;
	recordedAudioAvailable?: boolean;
	/** Play once on mount. Only use right after a learner gesture, or browsers block it. */
	autoPlay?: boolean;
	compact?: boolean;
}) {
	const { supported, ready, speaking, failed: speechFailed, speak, stop } = useSpeech();
	const audio = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [failed, setFailed] = useState(false);
	const [useTtsFallback, setUseTtsFallback] = useState(!recordedAudioAvailable);
	const autoPlayed = useRef(false);

	useEffect(() => () => {
		if (audio.current) {
			audio.current.onplay = null;
			audio.current.onended = null;
			audio.current.onerror = null;
			audio.current.pause();
		}
		stop();
	}, [stop]);

	function play() {
		if (speaking || playing) { audio.current?.pause(); stop(); setPlaying(false); return; }
		setFailed(false);
		if (useTtsFallback || !recordedAudioAvailable) {
			if (!(allowTts && lemma && speak(lemma, 'en-US'))) setFailed(true);
			return;
		}
		audio.current?.pause();
		const element = new Audio(`/api/audio?senseId=${encodeURIComponent(senseId)}`);
		audio.current = element;
		element.preload = 'auto';
		element.onplay = () => setPlaying(true);
		element.onended = () => {
			if (audio.current === element) setPlaying(false);
		};
		let fallbackStarted = false;
		const fallback = () => {
			if (fallbackStarted || audio.current !== element) return;
			fallbackStarted = true;
			setPlaying(false);
			setUseTtsFallback(allowTts && Boolean(lemma));
			if (!(allowTts && lemma && speak(lemma, 'en-US'))) setFailed(true);
		};
		element.onerror = fallback;
		void element.play().catch(fallback);
	}

	useEffect(() => {
		if (!autoPlay || autoPlayed.current) return;
		if ((useTtsFallback || !recordedAudioAvailable) && !ready) return;
		autoPlayed.current = true;
		const timer = setTimeout(play, 0);
		return () => clearTimeout(timer);
	// eslint-disable-next-line react-hooks/exhaustive-deps -- play once when audio becomes ready
	}, [autoPlay, ready]);

	const unavailable = failed || speechFailed;
	const ttsOnly = useTtsFallback || !recordedAudioAvailable;
	if (compact) {
		return <button type="button" onClick={play} disabled={ttsOnly && (!ready || !supported)} aria-label={playing || speaking ? 'Dừng phát âm' : `Nghe phát âm ${lemma}`} title={unavailable ? 'Không phát được âm thanh' : 'Nghe phát âm'} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent transition hover:border-accent hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${playing || speaking ? 'border-accent bg-accent-subtle' : ''}`}><MaterialIcon name={playing || speaking ? 'graphic_eq' : 'volume_up'} size={22} /></button>;
	}
	return <div className="space-y-1"><Button type="button" variant="secondary" disabled={ttsOnly && (!ready || !supported)} onClick={play} leftIcon={<MaterialIcon name={playing || speaking ? 'stop' : 'volume_up'} size={20} />}>{playing || speaking ? 'Dừng' : ttsOnly ? 'Nghe phát âm' : 'Nghe mẫu'}</Button>{ready && ttsOnly && !supported && <p className="text-xs text-warning">Trình duyệt này không hỗ trợ đọc thành tiếng.</p>}{unavailable && <p className="text-xs text-warning">Không phát được âm thanh trên trình duyệt này.</p>}</div>;
}
