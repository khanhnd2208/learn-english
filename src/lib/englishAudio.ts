"use client";

import { classifyPlayError, pickSpeechVoice } from '@/lib/english/audioPlayback';

/**
 * One player for every speaker button (word and sentence). Each tap starts fresh: the
 * server file plays through the media channel, and browser speech reads the text only when
 * that file cannot play. Nothing is remembered between taps, so one bad moment (a deploy,
 * a slow request) never mutes a word.
 */
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'blocked' | 'failed';

/** The server can take a few seconds to voice a word for the first time. */
const FILE_TIMEOUT_MS = 25_000;
const SPEECH_START_TIMEOUT_MS = 4_000;

type Playback = { owner: object; stop: () => void };
let current: Playback | null = null;

function stopCurrent() {
	const playing = current;
	current = null;
	playing?.stop();
}

function speakText(text: string, owner: object, onState: (state: PlaybackState) => void): void {
	if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
		onState('failed');
		return;
	}
	const synth = window.speechSynthesis;
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = 'en-US';
	utterance.rate = 0.9;
	const voice = pickSpeechVoice(synth.getVoices(), 'en-US');
	if (voice) utterance.voice = voice;
	let active = true;
	let started = false;
	// Kept in `current` so Chrome does not garbage-collect the utterance mid-speech.
	const playback: Playback = { owner, stop: () => { active = false; utterance.onend = null; utterance.onerror = null; synth.cancel(); onState('idle'); } };
	current = playback;
	utterance.onstart = () => { started = true; if (active) onState('playing'); };
	utterance.onend = () => { if (!active) return; active = false; if (current === playback) current = null; onState('idle'); };
	utterance.onerror = (event) => {
		if (!active) return;
		active = false;
		if (current === playback) current = null;
		onState(event.error === 'interrupted' || event.error === 'canceled' ? 'idle' : 'failed');
	};
	onState('loading');
	synth.cancel();
	if (synth.paused) synth.resume();
	synth.speak(utterance);
	// Some engines never start (no voice, blocked queue); say so instead of spinning forever.
	window.setTimeout(() => {
		if (!active || started || synth.speaking) return;
		active = false;
		if (current === playback) current = null;
		onState('failed');
	}, SPEECH_START_TIMEOUT_MS);
}

/**
 * Play `url`, falling back to browser speech of `text`. Without a url, browser speech only.
 * Any other playback stops first. `owner` identifies the button so it can stop only its own sound.
 */
export function playEnglishAudio({ url, text, owner, onState }: {
	url: string | null;
	text: string;
	owner: object;
	onState: (state: PlaybackState) => void;
}): void {
	stopCurrent();
	if (!url) {
		speakText(text, owner, onState);
		return;
	}
	const audio = new Audio(url);
	audio.preload = 'auto';
	let settled = false;
	let timer: number | null = null;
	const clear = () => {
		settled = true;
		if (timer !== null) window.clearTimeout(timer);
		audio.onplaying = null;
		audio.onended = null;
		audio.onerror = null;
	};
	const playback: Playback = { owner, stop: () => { clear(); audio.pause(); onState('idle'); } };
	current = playback;
	const fallback = () => {
		if (settled || current !== playback) return;
		clear();
		audio.pause();
		current = null;
		speakText(text, owner, onState);
	};
	audio.onplaying = () => { if (timer !== null) window.clearTimeout(timer); timer = null; if (!settled) onState('playing'); };
	audio.onended = () => {
		if (settled) return;
		clear();
		if (current === playback) current = null;
		onState('idle');
	};
	audio.onerror = fallback;
	timer = window.setTimeout(fallback, FILE_TIMEOUT_MS);
	onState('loading');
	audio.play().catch((error: unknown) => {
		if (settled || current !== playback) return;
		if (classifyPlayError(error) === 'broken') { fallback(); return; }
		// Autoplay without a recent tap: the file is fine, the learner just taps.
		clear();
		current = null;
		onState('blocked');
	});
}

/** Stop the sound started by `owner`, if it is still the one playing. */
export function stopEnglishAudio(owner: object): void {
	if (current?.owner === owner) stopCurrent();
}
