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

/**
 * One Piper process at a time keeps the CPU and memory of the shared VPS predictable.
 * A learner's tap goes ahead of background warm-up, so warming a whole chunk never delays it.
 */
type Job = { config: TtsConfig; text: string; file: string; done: Promise<boolean>; resolve: (ok: boolean) => void };
const urgent: Job[] = [];
const background: Job[] = [];
const jobs = new Map<string, Job>();
let running = false;

async function pump(): Promise<void> {
	if (running) return;
	running = true;
	try {
		for (let job = urgent.shift() ?? background.shift(); job; job = urgent.shift() ?? background.shift()) {
			const ok = await synthesizeTo(job.config, job.text, job.file).catch((error: unknown) => {
				console.error('[TTS] Synthesis failed', error);
				return false;
			});
			jobs.delete(job.file);
			job.resolve(ok);
		}
	} finally {
		running = false;
	}
}

/** Queue synthesis of `file`, or join the job already queued for it. An urgent request moves a waiting background job to the front. */
function enqueue(config: TtsConfig, text: string, file: string, priority: 'urgent' | 'background'): Promise<boolean> {
	const queued = jobs.get(file);
	if (queued) {
		const waiting = background.indexOf(queued);
		if (priority === 'urgent' && waiting >= 0) {
			background.splice(waiting, 1);
			urgent.push(queued);
		}
		return queued.done;
	}
	let resolve: (ok: boolean) => void = () => {};
	const done = new Promise<boolean>((settle) => { resolve = settle; });
	const job: Job = { config, text, file, done, resolve };
	jobs.set(file, job);
	(priority === 'urgent' ? urgent : background).push(job);
	void pump();
	return done;
}

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

/** Path of the cached WAV for `text`, synthesizing it first when missing. Null when TTS is off or fails. */
async function speechFile(rawText: string, priority: 'urgent' | 'background'): Promise<string | null> {
	const text = normalizeTtsText(rawText);
	const config = ttsConfig();
	if (!text || !config || !await serverTtsAvailable()) return null;
	const file = resolveAudioFile(config.root, ttsCacheName(text, config.model));
	if (!file) return null;
	if (await readable(file)) return file;
	return await enqueue(config, text, file, priority) ? file : null;
}

/** Speech for `text` as a WAV file, synthesized on first use and cached. Null when TTS is off or fails. */
export async function synthesizeSpeech(rawText: string): Promise<{ bytes: Buffer; type: string } | null> {
	const file = await speechFile(rawText, 'urgent');
	if (!file) return null;
	try {
		return { bytes: await fs.promises.readFile(file), type: 'audio/wav' };
	} catch {
		return null;
	}
}

/** Synthesize missing speech in the background, in order, so the learner's first tap plays at once. */
export function warmSpeech(texts: string[]): void {
	void (async () => {
		for (const text of new Set(texts)) await speechFile(text, 'background').catch(() => null);
	})();
}
