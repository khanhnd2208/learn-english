'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { classifyPlayError } from '@/lib/english/audioPlayback';
import { useServerTts } from '@/lib/useServerTts';
import { useSpeech } from '@/lib/useSpeech';

const failedAudioSenses = new Set<string>();

export default function EnglishAudioButton({
	senseId,
	lemma = '',
	allowTts = true,
	recordedAudioAvailable = false,
	autoPlay = false,
	compact = false,
	onUnavailable,
}: {
	senseId: string;
	lemma?: string;
	allowTts?: boolean;
	recordedAudioAvailable?: boolean;
	/** Play once on mount. Only use right after a learner gesture, or browsers block it. */
	autoPlay?: boolean;
	compact?: boolean;
	/** Called once when neither the recorded file nor speech can play. */
	onUnavailable?: () => void;
}) {
	const { supported, ready, speaking, failed: speechFailed, speak, stop, prime } = useSpeech();
	const serverTts = useServerTts();
	const audio = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [failed, setFailed] = useState(false);
	/** The browser blocked playback without a recent tap; the file itself is fine. */
	const [needsTap, setNeedsTap] = useState(false);
	/** The audio file for this word failed once; browser speech takes over. */
	const [fileFailed, setFileFailed] = useState(failedAudioSenses.has(senseId));
	// A real file plays through the media channel, so it works where browser speech is silent
	// (iOS silent switch, no English voice installed). Without a recording the server speaks the word.
	const playFile = !fileFailed && (recordedAudioAvailable || serverTts !== false);
	const ttsOnly = !playFile;
	const autoPlayed = useRef(false);
	const fallbackTimer = useRef<number | null>(null);

	useEffect(() => () => {
		if (audio.current) {
			audio.current.onplay = null;
			audio.current.onplaying = null;
			audio.current.onended = null;
			audio.current.onerror = null;
			audio.current.pause();
		}
		if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
		stop();
	}, [stop]);

	function play() {
		if (speaking || playing) { audio.current?.pause(); stop(); setPlaying(false); return; }
		setFailed(false);
		setNeedsTap(false);
		if (ttsOnly) {
			if (!(allowTts && lemma && speak(lemma, 'en-US'))) setFailed(true);
			return;
		}
		audio.current?.pause();
		prime();
		const element = new Audio(`/api/audio?senseId=${encodeURIComponent(senseId)}`);
		audio.current = element;
		element.preload = 'auto';
		element.onended = () => {
			if (audio.current === element) {
				setPlaying(false);
				if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
				fallbackTimer.current = null;
			}
		};
		let fallbackStarted = false;
		let started = false;
		element.onplaying = () => {
			started = true;
			setPlaying(true);
		};
		const fallback = () => {
			if (fallbackStarted || audio.current !== element) return;
			fallbackStarted = true;
			failedAudioSenses.add(senseId);
			if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
			fallbackTimer.current = null;
			element.pause();
			setPlaying(false);
			setFileFailed(allowTts && Boolean(lemma));
			if (!(allowTts && lemma && speak(lemma, 'en-US'))) setFailed(true);
		};
		element.onerror = fallback;
		fallbackTimer.current = window.setTimeout(() => {
			if (started || element.ended) return;
			fallback();
		// The first request for a synthesized word waits for the voice to be generated.
		}, recordedAudioAvailable ? 4_000 : 10_000);
		void element.play().catch((error: unknown) => {
			if (classifyPlayError(error) === 'broken') { fallback(); return; }
			if (audio.current !== element) return;
			if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
			fallbackTimer.current = null;
			setPlaying(false);
			setNeedsTap(true);
		});
	}

	useEffect(() => {
		if (!autoPlay || autoPlayed.current) return;
		if (!recordedAudioAvailable && serverTts === null) return;
		if (ttsOnly && !ready) return;
		const timer = setTimeout(() => {
			autoPlayed.current = true;
			play();
		}, 0);
		return () => clearTimeout(timer);
	// eslint-disable-next-line react-hooks/exhaustive-deps -- play once when audio becomes ready
	}, [autoPlay, ready, serverTts]);

	const unavailable = failed || speechFailed;
	const onUnavailableRef = useRef(onUnavailable);
	useEffect(() => { onUnavailableRef.current = onUnavailable; }, [onUnavailable]);
	useEffect(() => { if (unavailable) onUnavailableRef.current?.(); }, [unavailable]);
	if (compact) {
		const note = needsTap ? 'Bấm để nghe' : unavailable ? 'Không phát được' : '';
		const button = <button type="button" onClick={play} disabled={ttsOnly && (!ready || !supported)} aria-label={playing || speaking ? 'Dừng phát âm' : `Nghe phát âm ${lemma}`} title={unavailable ? 'Không phát được — kiểm tra âm lượng/công tắc im lặng' : 'Nghe phát âm'} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent transition hover:border-accent hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${playing || speaking || needsTap ? 'border-accent bg-accent-subtle' : ''} ${needsTap ? 'animate-pulse motion-reduce:animate-none' : ''}`}><MaterialIcon name={playing || speaking ? 'graphic_eq' : unavailable && !needsTap ? 'volume_off' : 'volume_up'} size={22} /></button>;
		if (!note) return button;
		return <span className="inline-flex shrink-0 flex-col items-center gap-0.5">{button}<span role="status" className={`text-[10px] font-bold leading-none ${needsTap ? 'text-accent' : 'text-warning'}`}>{note}</span></span>;
	}
	return <div className="space-y-1"><Button type="button" variant="secondary" disabled={ttsOnly && (!ready || !supported)} onClick={play} leftIcon={<MaterialIcon name={playing || speaking ? 'stop' : 'volume_up'} size={20} />}>{playing || speaking ? 'Dừng' : ttsOnly ? 'Nghe phát âm' : 'Nghe mẫu'}</Button>{ready && ttsOnly && !supported && <p className="text-xs text-warning">Trình duyệt này không hỗ trợ đọc thành tiếng.</p>}{needsTap && <p className="text-xs font-bold text-accent">Bấm để nghe</p>}{unavailable && <p className="text-xs text-warning">Không phát được âm thanh trên trình duyệt này.</p>}</div>;
}
