'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useSpeech } from '@/lib/useSpeech';

export default function EnglishAudioButton({
	senseId,
	lemma = '',
	allowTts = true,
	recordedAudioAvailable = true,
}: {
	senseId: string;
	lemma?: string;
	allowTts?: boolean;
	recordedAudioAvailable?: boolean;
}) {
	const { supported, ready, speaking, failed: speechFailed, speak, stop } = useSpeech();
	const audio = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [failed, setFailed] = useState(false);
	const [useTtsFallback, setUseTtsFallback] = useState(!recordedAudioAvailable);

	useEffect(() => () => { audio.current?.pause(); stop(); }, [stop]);

	function play() {
		if (speaking || playing) { audio.current?.pause(); stop(); setPlaying(false); return; }
		setFailed(false);
		if (useTtsFallback || !recordedAudioAvailable) {
			if (!(allowTts && lemma && speak(lemma, 'en-US'))) setFailed(true);
			return;
		}
		const element = new Audio(`/api/audio?senseId=${encodeURIComponent(senseId)}`);
		audio.current = element;
		element.preload = 'auto';
		element.onplay = () => setPlaying(true);
		element.onended = () => setPlaying(false);
		element.onerror = () => {
			setPlaying(false);
			setUseTtsFallback(allowTts && Boolean(lemma));
			if (!(allowTts && lemma && speak(lemma, 'en-US'))) setFailed(true);
		};
		void element.play().catch(() => element.onerror?.(new Event('error')));
	}

	const unavailable = failed || speechFailed;
	const ttsOnly = useTtsFallback || !recordedAudioAvailable;
	return <div className="space-y-1"><Button type="button" variant="secondary" disabled={ttsOnly && (!ready || !supported)} onClick={play} leftIcon={<MaterialIcon name={playing || speaking ? 'stop' : 'volume_up'} size={20} />}>{playing || speaking ? 'Dừng' : ttsOnly ? 'Nghe phát âm' : 'Nghe mẫu'}</Button>{ready && ttsOnly && !supported && <p className="text-xs text-warning">Trình duyệt này không hỗ trợ đọc thành tiếng.</p>}{unavailable && <p className="text-xs text-warning">Không phát được âm thanh trên trình duyệt này.</p>}</div>;
}
