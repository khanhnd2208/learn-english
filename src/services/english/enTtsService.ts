import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { englishAudioRoot, normalizeTtsText, resolveAudioFile, ttsCacheName } from '@/lib/english/audioPath';

/**
 * Server-side speech for words without a recorded file. Piper runs as its own process
 * (`PIPER_BIN`, voice `PIPER_MODEL`), and each result is cached under `ENGLISH_AUDIO_ROOT/tts/`.
 * Learners then get a real audio file, which plays on devices where browser speech is
 * silent (iOS silent switch, no English voice installed, blocked speech queue).
 */

const SYNTH_TIMEOUT_MS = 20_000;

type TtsConfig = { bin: string; model: string; root: string };

function ttsConfig(): TtsConfig | null {
	const bin = process.env.PIPER_BIN?.trim();
	const model = process.env.PIPER_MODEL?.trim();
	const root = englishAudioRoot();
	return bin && model && root ? { bin, model, root } : null;
}

async function readable(file: string): Promise<boolean> {
	try {
		await fs.promises.access(file, fs.constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

let availability: { value: boolean; checkedAt: number } | null = null;

/** Whether the server can synthesize speech right now. Rechecked at most once a minute. */
export async function serverTtsAvailable(): Promise<boolean> {
	if (availability && Date.now() - availability.checkedAt < 60_000) return availability.value;
	const config = ttsConfig();
	const value = config !== null
		&& await readable(config.bin)
		&& await readable(config.model)
		&& await readable(`${config.model}.json`);
	availability = { value, checkedAt: Date.now() };
	return value;
}

/** One Piper process at a time keeps the CPU and memory of the shared VPS predictable. */
let queue: Promise<unknown> = Promise.resolve();
const inFlight = new Map<string, Promise<boolean>>();

function runPiper(config: TtsConfig, text: string, output: string): Promise<boolean> {
	return new Promise((resolve) => {
		const child = spawn(config.bin, ['-m', config.model, '-f', output], { stdio: ['pipe', 'ignore', 'pipe'] });
		let stderr = '';
		const timer = setTimeout(() => child.kill('SIGKILL'), SYNTH_TIMEOUT_MS);
		child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-2_000); });
		child.on('error', (error) => {
			clearTimeout(timer);
			console.error('[TTS] Piper could not start', error);
			resolve(false);
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			if (code !== 0) console.error(`[TTS] Piper exited with ${code}`, stderr);
			resolve(code === 0);
		});
		child.stdin.end(`${text}\n`);
	});
}

async function synthesizeTo(config: TtsConfig, text: string, file: string): Promise<boolean> {
	await fs.promises.mkdir(path.dirname(file), { recursive: true });
	const temp = `${file}.${process.pid}.${Date.now()}.tmp.wav`;
	try {
		const ok = await runPiper(config, text, temp);
		const size = ok ? (await fs.promises.stat(temp).catch(() => null))?.size ?? 0 : 0;
		// A WAV header alone is 44 bytes; anything that small has no speech in it.
		if (size <= 44) return false;
		await fs.promises.rename(temp, file);
		return true;
	} finally {
		await fs.promises.rm(temp, { force: true });
	}
}

/** Speech for `text` as a WAV file, synthesized on first use and cached. Null when TTS is off or fails. */
export async function synthesizeSpeech(rawText: string): Promise<{ bytes: Buffer; type: string } | null> {
	const text = normalizeTtsText(rawText);
	const config = ttsConfig();
	if (!text || !config || !await serverTtsAvailable()) return null;
	const file = resolveAudioFile(config.root, ttsCacheName(text, config.model));
	if (!file) return null;

	if (!await readable(file)) {
		let job = inFlight.get(file);
		if (!job) {
			job = queue.then(() => synthesizeTo(config, text, file)).catch((error: unknown) => {
				console.error('[TTS] Synthesis failed', error);
				return false;
			});
			queue = job;
			inFlight.set(file, job);
			void job.finally(() => inFlight.delete(file));
		}
		if (!await job) return null;
	}
	try {
		return { bytes: await fs.promises.readFile(file), type: 'audio/wav' };
	} catch {
		return null;
	}
}
