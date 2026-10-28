import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTtsText, TTS_MAX_CHARS, ttsCacheName } from '@/lib/english/audioPath';

describe('normalizeTtsText', () => {
	it('collapses whitespace and control characters', () => {
		expect(normalizeTtsText('  slow \n\t down  ')).toBe('slow down');
	});

	it('rejects empty and overly long text', () => {
		expect(normalizeTtsText('   ')).toBe('');
		expect(normalizeTtsText('a'.repeat(TTS_MAX_CHARS + 1))).toBe('');
	});
});

describe('ttsCacheName', () => {
	it('stays inside the tts folder and depends on voice and text', () => {
		const name = ttsCacheName('intensity', '/opt/piper/en_US-lessac-medium.onnx');
		expect(name).toMatch(/^tts[/\\][0-9a-f]{32}\.wav$/);
		expect(ttsCacheName('intensity', '/other/en_US-lessac-medium.onnx')).toBe(name);
		expect(ttsCacheName('intensity', '/opt/piper/en_US-amy-low.onnx')).not.toBe(name);
		expect(ttsCacheName('intense', '/opt/piper/en_US-lessac-medium.onnx')).not.toBe(name);
	});
});

describe('synthesizeSpeech', () => {
	let dir: string;
	let calls: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'en-tts-'));
		calls = path.join(dir, 'calls.log');
		const bin = path.join(dir, 'piper');
		// Stand-in for Piper: same flags, writes a WAV-sized file, logs each run.
		fs.writeFileSync(bin, `#!/bin/sh\nread text\necho "$text" >> "${calls}"\nwhile [ "$#" -gt 0 ]; do if [ "$1" = "-f" ]; then out="$2"; fi; shift; done\nhead -c 200 /dev/zero > "$out"\n`, { mode: 0o755 });
		const model = path.join(dir, 'voice.onnx');
		fs.writeFileSync(model, '');
		fs.writeFileSync(`${model}.json`, '{}');
		vi.stubEnv('PIPER_BIN', bin);
		vi.stubEnv('PIPER_MODEL', model);
		vi.stubEnv('ENGLISH_AUDIO_ROOT', path.join(dir, 'audio'));
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('synthesizes once, then serves the cached file', async () => {
		const { synthesizeSpeech, serverTtsAvailable } = await import('@/services/english/enTtsService');
		expect(await serverTtsAvailable()).toBe(true);
		const [first, second] = await Promise.all([synthesizeSpeech('intensity'), synthesizeSpeech(' intensity ')]);
		expect(first?.type).toBe('audio/wav');
		expect(first?.bytes.length).toBe(200);
		expect(second?.bytes.length).toBe(200);
		expect(await synthesizeSpeech('intensity')).not.toBeNull();
		expect(fs.readFileSync(calls, 'utf8').trim().split('\n')).toEqual(['intensity']);
	});

	it('returns null when the voice is missing', async () => {
		fs.rmSync(path.join(dir, 'voice.onnx.json'));
		const { synthesizeSpeech, serverTtsAvailable } = await import('@/services/english/enTtsService');
		expect(await serverTtsAvailable()).toBe(false);
		expect(await synthesizeSpeech('intensity')).toBeNull();
	});
});
