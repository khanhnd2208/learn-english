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
	const retryRef = useRef<number | null>(null);

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
			if (utteranceRef.current !== null) {
				window.speechSynthesis.cancel();
				utteranceRef.current = null;
			}
			if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
			watchdogRef.current = null;
			if (retryRef.current !== null) window.clearTimeout(retryRef.current);
			retryRef.current = null;
		};
	}, []);

	const prime = useCallback((): boolean => {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
		try {
			const utterance = new SpeechSynthesisUtterance('');
			utterance.volume = 0;
			utteranceRef.current = utterance;
			utterance.onend = () => {
				if (utteranceRef.current === utterance) utteranceRef.current = null;
			};
			utterance.onerror = () => {
				if (utteranceRef.current === utterance) utteranceRef.current = null;
			};
			window.speechSynthesis.speak(utterance);
			return true;
		} catch {
			return false;
		}
	}, []);

	const speak = useCallback((text: string, lang = 'en-US'): boolean => {
		if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return false;
		try {
			if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
			watchdogRef.current = null;
			if (retryRef.current !== null) window.clearTimeout(retryRef.current);
			retryRef.current = null;
			const hadQueuedSpeech = window.speechSynthesis.speaking || window.speechSynthesis.pending;
			utteranceRef.current = null;
			if (hadQueuedSpeech) window.speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(text);
			utteranceRef.current = utterance;
			utterance.lang = lang;
			utterance.rate = 0.9;
			utterance.pitch = 1;
			utterance.volume = 1;
			const requestedLanguage = lang.split('-')[0]?.toLowerCase();
			if (voicesRef.current.length === 0) voicesRef.current = window.speechSynthesis.getVoices();
			const matchingVoice = voicesRef.current.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
				?? voicesRef.current.find((voice) => voice.lang.toLowerCase().startsWith(requestedLanguage ?? ''));
			if (matchingVoice) utterance.voice = matchingVoice;
			utterance.onstart = () => {
				if (utteranceRef.current === utterance) setSpeaking(true);
			};
			utterance.onend = () => {
				if (utteranceRef.current !== utterance) return;
				if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
				watchdogRef.current = null;
				setSpeaking(false);
				utteranceRef.current = null;
			};
			utterance.onerror = (event) => {
				if (utteranceRef.current !== utterance) return;
				if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
				watchdogRef.current = null;
				setSpeaking(false);
				utteranceRef.current = null;
				if (event.error !== 'interrupted' && event.error !== 'canceled') {
					setFailed(true);
				}
			};
			setFailed(false);
			if (window.speechSynthesis.paused) window.speechSynthesis.resume();
			window.speechSynthesis.speak(utterance);
			watchdogRef.current = window.setTimeout(() => {
				if (utteranceRef.current !== utterance) return;
				if (!window.speechSynthesis.speaking) {
					setFailed(true);
					setSpeaking(false);
					utteranceRef.current = null;
				}
				watchdogRef.current = null;
			}, 1_500);
			if (hadQueuedSpeech) {
				retryRef.current = window.setTimeout(() => {
					if (utteranceRef.current !== utterance || window.speechSynthesis.speaking) return;
					window.speechSynthesis.resume();
					window.speechSynthesis.speak(utterance);
				}, 250);
			}
			return true;
		} catch {
			setFailed(true);
			return false;
		}
	}, []);

	const stop = useCallback(() => {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			if (utteranceRef.current !== null) {
				window.speechSynthesis.cancel();
				utteranceRef.current = null;
			}
			if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
			watchdogRef.current = null;
			if (retryRef.current !== null) window.clearTimeout(retryRef.current);
			retryRef.current = null;
			setSpeaking(false);
		}
	}, []);

	return { supported, ready, speaking, failed, speak, stop, prime };
}
