"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeech() {
	const [supported, setSupported] = useState(false);
	const [ready, setReady] = useState(false);
	const [speaking, setSpeaking] = useState(false);
	const [failed, setFailed] = useState(false);
	const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const watchdogRef = useRef<number | null>(null);

	useEffect(() => {
		const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
		const supportTimer = window.setTimeout(() => {
			setSupported(hasSpeech);
			setReady(true);
		}, 0);
		if (!hasSpeech) {
			return () => window.clearTimeout(supportTimer);
		}

		const loadVoices = () => {
			voicesRef.current = window.speechSynthesis.getVoices();
		};
		// Browsers may already have voices ready (Firefox) or fire voiceschanged (Chrome)
		loadVoices();
		window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
		return () => {
			window.clearTimeout(supportTimer);
			window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
			window.speechSynthesis.cancel();
			if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
			utteranceRef.current = null;
		};
	}, []);

	const speak = useCallback((text: string, lang = 'en-US'): boolean => {
		if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return false;
		try {
			window.speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(text);
			utteranceRef.current = utterance;
			utterance.lang = lang;
			utterance.rate = 0.9;
			utterance.pitch = 1;
			utterance.volume = 1;
			const requestedLanguage = lang.split('-')[0]?.toLowerCase();
			const matchingVoice = voicesRef.current.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
				?? voicesRef.current.find((voice) => voice.lang.toLowerCase().startsWith(requestedLanguage ?? ''));
			if (matchingVoice) utterance.voice = matchingVoice;
			utterance.onstart = () => setSpeaking(true);
			utterance.onend = () => {
				if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
				setSpeaking(false);
				utteranceRef.current = null;
			};
			utterance.onerror = (event) => {
				if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
				setSpeaking(false);
				utteranceRef.current = null;
				if (event.error !== 'interrupted' && event.error !== 'canceled') {
					setFailed(true);
				}
			};
			setFailed(false);
			setSpeaking(true);
			if (window.speechSynthesis.paused) window.speechSynthesis.resume();
			window.speechSynthesis.speak(utterance);
			watchdogRef.current = window.setTimeout(() => {
				setSpeaking(false);
				utteranceRef.current = null;
			}, Math.max(5_000, text.length * 400));
			return true;
		} catch {
			setFailed(true);
			return false;
		}
	}, []);

	const stop = useCallback(() => {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			window.speechSynthesis.cancel();
			if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
			setSpeaking(false);
			utteranceRef.current = null;
		}
	}, []);

	return { supported, ready, speaking, failed, speak, stop };
}
