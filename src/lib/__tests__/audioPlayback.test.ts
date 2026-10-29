import { describe, expect, it } from 'vitest';
import { classifyPlayError, parseServerTtsStatus, pickSpeechVoice } from '@/lib/english/audioPlayback';

describe('classifyPlayError', () => {
	it('treats an autoplay block as blocked, not broken', () => {
		expect(classifyPlayError(new DOMException('no gesture', 'NotAllowedError'))).toBe('blocked');
		expect(classifyPlayError({ name: 'NotAllowedError' })).toBe('blocked');
	});

	it('treats every other rejection as a broken source', () => {
		expect(classifyPlayError(new DOMException('bad file', 'NotSupportedError'))).toBe('broken');
		expect(classifyPlayError(new Error('network'))).toBe('broken');
		expect(classifyPlayError(undefined)).toBe('broken');
	});
});

describe('parseServerTtsStatus', () => {
	it('keeps a real answer from the app', () => {
		expect(parseServerTtsStatus(true, { ok: true, data: { serverTts: true } })).toBe(true);
		expect(parseServerTtsStatus(true, { ok: true, data: { serverTts: false } })).toBe(false);
	});

	it('treats a restarting server or odd body as unknown, never as "no server audio"', () => {
		expect(parseServerTtsStatus(false, null)).toBeNull();
		expect(parseServerTtsStatus(false, { ok: true, data: { serverTts: true } })).toBeNull();
		expect(parseServerTtsStatus(true, null)).toBeNull();
		expect(parseServerTtsStatus(true, { ok: false, error: 'Unauthorized' })).toBeNull();
		expect(parseServerTtsStatus(true, { ok: true, data: {} })).toBeNull();
	});
});

describe('pickSpeechVoice', () => {
	const network = { name: 'Google US English', lang: 'en-US', localService: false };
	const local = { name: 'Samantha', lang: 'en-US', localService: true };
	const british = { name: 'Daniel', lang: 'en-GB', localService: true };
	const vietnamese = { name: 'Linh', lang: 'vi-VN', localService: true };

	it('prefers a voice installed on the device over a network voice', () => {
		expect(pickSpeechVoice([network, local], 'en-US')).toBe(local);
		expect(pickSpeechVoice([network, british], 'en-US')).toBe(british);
	});

	it('falls back to any matching voice, and to none for another language', () => {
		expect(pickSpeechVoice([vietnamese, network], 'en-US')).toBe(network);
		expect(pickSpeechVoice([{ name: 'Android', lang: 'en_US', localService: true }], 'en-US')?.name).toBe('Android');
		expect(pickSpeechVoice([vietnamese], 'en-US')).toBeUndefined();
	});
});
