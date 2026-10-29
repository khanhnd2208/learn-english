import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTtsText, spokenText, TTS_MAX_CHARS, ttsCacheName } from '@/lib/english/audioPath';

describe('normalizeTtsText', () => {
	it('collapses whitespace and control characters', () => {
		expect(normalizeTtsText('  slow \n\t down  ')).toBe('slow down');
	});

	it('rejects empty and overly long text', () => {
		expect(normalizeTtsText('   ')).toBe('');
		expect(normalizeTtsText('a'.repeat(TTS_MAX_CHARS + 1))).toBe('');
	});
});

describe('spokenText', () => {
	it('reads words and phrases as finished statements', () => {
		expect(spokenText(' thirsty ')).toBe('thirsty.');
		expect(spokenText('look forward to')).toBe('look forward to.');
	});

	it('keeps sentences that already end', () => {
		expect(spokenText('He ordered a coffee.')).toBe('He ordered a coffee.');
		expect(spokenText('Are you hungry?')).toBe('Are you hungry?');
		expect(spokenText('She said "wait!"')).toBe('She said "wait!"');
		expect(spokenText('  ')).toBe('');
	});
});

describe('ttsCacheName', () => {
	it('stays inside the tts folder and depends on voice and text', () => {
		const name = ttsCacheName('intensity', '/opt/piper/en_US-lessac-medium.onnx');
		expect(name).toMatch(/^tts[/\\][0-9a-f]{32}\.ogg$/);
		expect(ttsCacheName('intensity', '/opt/piper/en_US-lessac-medium.onnx', 'wav')).toBe(name.replace('.ogg', '.wav'));
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
		vi.stubEnv('TTS_FORMAT', 'wav');
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

	it('lets a learner tap jump ahead of background warm-up', async () => {
		// Each run takes a moment so the queue order is visible.
		const bin = path.join(dir, 'piper');
		fs.writeFileSync(bin, fs.readFileSync(bin, 'utf8').replace(`>> "${calls}"\n`, `>> "${calls}"\nsleep 0.2\n`));
		const { synthesizeSpeech, warmSpeech } = await import('@/services/english/enTtsService');
		warmSpeech(['first', 'second', 'third', 'first']);
		await vi.waitFor(() => expect(fs.existsSync(calls)).toBe(true));
		const tapped = await Promise.all([synthesizeSpeech('tapped'), synthesizeSpeech('third')]);
		expect(tapped.map((file) => file?.bytes.length)).toEqual([200, 200]);
		await vi.waitFor(() => expect(fs.readFileSync(calls, 'utf8').trim().split('\n')).toHaveLength(4));
		expect(fs.readFileSync(calls, 'utf8').trim().split('\n')).toEqual(['first', 'tapped', 'third', 'second']);
	});

	it('keeps one worker with the voice loaded instead of starting Piper per word', async () => {
		const starts = path.join(dir, 'starts.log');
		// Stand-in for the Python worker: same line protocol, logs each start and request.
		fs.writeFileSync(path.join(dir, 'python'), [
			'#!/bin/sh',
			`echo start >> "${starts}"`,
			'echo \'{"ready": true}\'',
			'while IFS= read -r line; do',
			'  id=$(printf "%s" "$line" | sed -E \'s/.*"id":([0-9]+).*/\\1/\')',
			'  out=$(printf "%s" "$line" | sed -E \'s/.*"out":"([^"]*)".*/\\1/\')',
			'  text=$(printf "%s" "$line" | sed -E \'s/.*"text":"([^"]*)".*/\\1/\')',
			`  echo "worker $text" >> "${calls}"`,
			'  head -c 300 /dev/zero > "$out"',
			'  echo "{\\"id\\": $id, \\"ok\\": true}"',
			'done',
			'',
		].join('\n'), { mode: 0o755 });
		const { synthesizeSpeech, prepareSpeechEngine } = await import('@/services/english/enTtsService');
		await prepareSpeechEngine();
		expect((await synthesizeSpeech('thirsty.'))?.bytes.length).toBe(300);
		expect((await synthesizeSpeech('order.'))?.bytes.length).toBe(300);
		expect(fs.readFileSync(calls, 'utf8').trim().split('\n')).toEqual(['worker thirsty.', 'worker order.']);
		expect(fs.readFileSync(starts, 'utf8').trim().split('\n')).toEqual(['start']);
	});

	it('returns null when the voice is missing', async () => {
		fs.rmSync(path.join(dir, 'voice.onnx.json'));
		const { synthesizeSpeech, serverTtsAvailable } = await import('@/services/english/enTtsService');
		expect(await serverTtsAvailable()).toBe(false);
		expect(await synthesizeSpeech('intensity')).toBeNull();
	});
});

describe('Opus fallback without ffmpeg', () => {
	it('continues to serve a WAV when the encoder is unavailable', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'en-tts-fallback-'));
		try {
			const bin = path.join(dir, 'piper');
			fs.writeFileSync(bin, '#!/bin/sh\nwhile [ "$#" -gt 0 ]; do if [ "$1" = "-f" ]; then out="$2"; fi; shift; done\nhead -c 200 /dev/zero > "$out"\n', { mode: 0o755 });
			const model = path.join(dir, 'voice.onnx'); fs.writeFileSync(model, ''); fs.writeFileSync(`${model}.json`, '{}');
			vi.stubEnv('PIPER_BIN', bin); vi.stubEnv('PIPER_MODEL', model); vi.stubEnv('ENGLISH_AUDIO_ROOT', path.join(dir, 'audio'));
			vi.stubEnv('FFMPEG_BIN', '/nonexistent'); vi.stubEnv('TTS_FORMAT', 'opus'); vi.resetModules();
			const { synthesizeSpeech } = await import('@/services/english/enTtsService');
			expect((await synthesizeSpeech('hello'))?.type).toBe('audio/wav');
		} finally { vi.unstubAllEnvs(); fs.rmSync(dir, { recursive: true, force: true }); }
	});
});
