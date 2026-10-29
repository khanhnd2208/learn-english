import fs from 'fs';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import readline from 'readline';
import { audioContentType, englishAudioRoot, normalizeTtsText, resolveAudioFile, ttsCacheName } from '@/lib/english/audioPath';

/**
 * Server-side speech for words without a recorded file. Piper runs as its own process
 * (`PIPER_BIN`, voice `PIPER_MODEL`), and each result is cached under `ENGLISH_AUDIO_ROOT/tts/`.
 * Learners then get a real audio file, which plays on devices where browser speech is
 * silent (iOS silent switch, no English voice installed, blocked speech queue).
 */

const SYNTH_TIMEOUT_MS = 20_000;
/** Loading the voice takes ~5 s on the VPS; allow for a busy machine. */
const WORKER_READY_TIMEOUT_MS = 60_000;
/** An idle worker is closed to give its memory back; the next session starts it again. */
const WORKER_IDLE_MS = 30 * 60_000;
/** After the worker fails, use the one-shot Piper CLI for a while before trying again. */
const WORKER_RETRY_MS = 5 * 60_000;

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

/**
 * A long-lived Piper process (`scripts/piper_worker.py`) that keeps the voice loaded, so a word
 * takes about 0.1 s instead of the ~5 s the CLI spends loading the voice for every request.
 * Uses the Python next to `PIPER_BIN` (or `PIPER_PYTHON`); without it the CLI is used.
 */
type Worker = {
	child: ChildProcess;
	ready: Promise<boolean>;
	pending: Map<number, (ok: boolean) => void>;
	nextId: number;
	idle: NodeJS.Timeout | null;
};
let worker: Worker | null = null;
let workerFailedAt = 0;

function stopWorker(target: Worker, failed: boolean) {
	if (worker === target) worker = null;
	if (failed) workerFailedAt = Date.now();
	if (target.idle) clearTimeout(target.idle);
	for (const settle of target.pending.values()) settle(false);
	target.pending.clear();
	if (target.child.exitCode === null) target.child.kill('SIGKILL');
}

async function startWorker(config: TtsConfig): Promise<Worker | null> {
	if (worker) return worker;
	if (Date.now() - workerFailedAt < WORKER_RETRY_MS) return null;
	const python = process.env.PIPER_PYTHON?.trim() || path.join(path.dirname(config.bin), 'python');
	const script = path.join(process.cwd(), 'scripts', 'piper_worker.py');
	if (!await readable(python) || !await readable(script)) return null;
	if (worker) return worker;
	const child = spawn(process.platform === 'linux' && fs.existsSync('/usr/bin/nice') ? '/usr/bin/nice' : python, process.platform === 'linux' && fs.existsSync('/usr/bin/nice') ? ['-n', '10', python, script, config.model] : [script, config.model], { stdio: ['pipe', 'pipe', 'pipe'] });
	let markReady: (ok: boolean) => void = () => {};
	const target: Worker = { child, ready: new Promise((settle) => { markReady = settle; }), pending: new Map(), nextId: 1, idle: null };
	worker = target;
	const readyTimer = setTimeout(() => {
		console.error('[TTS] Piper worker did not load the voice in time');
		markReady(false);
		stopWorker(target, true);
	}, WORKER_READY_TIMEOUT_MS);
	let stderr = '';
	child.stderr?.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-2_000); });
	child.on('error', (error) => {
		console.error('[TTS] Piper worker could not start', error);
		clearTimeout(readyTimer);
		markReady(false);
		stopWorker(target, true);
	});
	child.on('exit', (code) => {
		clearTimeout(readyTimer);
		markReady(false);
		const expected = worker !== target;
		if (!expected) console.error(`[TTS] Piper worker exited with ${code}`, stderr);
		stopWorker(target, !expected);
	});
	readline.createInterface({ input: child.stdout! }).on('line', (line) => {
		let message: { ready?: boolean; id?: number; ok?: boolean; error?: string };
		try { message = JSON.parse(line); } catch { return; }
		if (message.ready) {
			clearTimeout(readyTimer);
			markReady(true);
			return;
		}
		if (typeof message.id !== 'number') return;
		if (!message.ok) console.error('[TTS] Piper worker failed a request', message.error);
		target.pending.get(message.id)?.(message.ok === true);
		target.pending.delete(message.id);
	});
	return target;
}

/** Voice `text` into `output` with the worker. Null when the worker is not available. */
async function workerSynthesize(config: TtsConfig, text: string, output: string): Promise<boolean | null> {
	const target = await startWorker(config);
	if (!target || !await target.ready || worker !== target) return null;
	if (target.idle) clearTimeout(target.idle);
	const id = target.nextId++;
	const ok = await new Promise<boolean>((settle) => {
		const timer = setTimeout(() => {
			console.error('[TTS] Piper worker timed out');
			stopWorker(target, true);
		}, SYNTH_TIMEOUT_MS);
		target.pending.set(id, (result) => { clearTimeout(timer); settle(result); });
		target.child.stdin?.write(`${JSON.stringify({ id, text, out: output })}\n`);
	});
	if (worker === target) target.idle = setTimeout(() => stopWorker(target, false), WORKER_IDLE_MS).unref();
	return ok;
}

/** Load the voice ahead of the first request, e.g. when a learner opens a page with audio. */
export async function prepareSpeechEngine(): Promise<void> {
	const config = ttsConfig();
	if (!config || !await serverTtsAvailable()) return;
	const target = await startWorker(config);
	if (target && await target.ready && worker === target && !target.idle && target.pending.size === 0) {
		target.idle = setTimeout(() => stopWorker(target, false), WORKER_IDLE_MS).unref();
	}
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

function ffmpegBin() { return process.env.FFMPEG_BIN?.trim() || 'ffmpeg'; }
let ffmpegStatus: { available: boolean; at: number; bin: string } | null = null;
async function ffmpegAvailable() {
	const bin = ffmpegBin();
	if (ffmpegStatus?.bin === bin && Date.now() - ffmpegStatus.at < 60_000) return ffmpegStatus.available;
	const available = await new Promise<boolean>((resolve) => {
		const child = spawn(bin, ['-version'], { stdio: 'ignore' });
		child.once('error', () => resolve(false));
		child.once('close', (code) => resolve(code === 0));
	});
	ffmpegStatus = { available, at: Date.now(), bin };
	return available;
}

async function encode(source: string, target: string, format: 'ogg' | 'mp3'): Promise<boolean> {
	if (!await ffmpegAvailable()) return false;
	const temp = `${target}.${process.pid}.${randomUUID()}.tmp.${format}`;
	const args = format === 'ogg' ? ['-ac', '1', '-c:a', 'libopus', '-b:a', '24k', '-application', 'voip'] : ['-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k'];
	try {
		const ok = await new Promise<boolean>((resolve) => {
			const child = spawn(ffmpegBin(), ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, ...args, temp], { stdio: 'ignore' });
			child.once('error', () => resolve(false));
			child.once('close', (code) => resolve(code === 0));
		});
		if (!ok || ((await fs.promises.stat(temp).catch(() => null))?.size ?? 0) === 0) return false;
		await fs.promises.rename(temp, target);
		return true;
	} finally { await fs.promises.rm(temp, { force: true }); }
}

async function synthesizeTo(config: TtsConfig, text: string, file: string): Promise<boolean> {
	await fs.promises.mkdir(path.dirname(file), { recursive: true });
	const wav = file.replace(/\.(ogg|mp3|wav)$/, '.wav');
	if (file.endsWith('.mp3')) {
		const ogg = file.replace(/\.mp3$/, '.ogg');
		const source = await readable(ogg) ? ogg : wav;
		return await readable(source) && await encode(source, file, 'mp3');
	}
	const temp = `${wav}.${process.pid}.${randomUUID()}.tmp.wav`;
	try {
		const ok = await workerSynthesize(config, text, temp) || await runPiper(config, text, temp);
		const size = ok ? (await fs.promises.stat(temp).catch(() => null))?.size ?? 0 : 0;
		if (size <= 44) return false;
		if (file.endsWith('.ogg')) {
			if (await encode(temp, file, 'ogg')) return true;
			console.error('[TTS] encode failed; serving WAV');
			await fs.promises.rename(temp, wav);
			return true;
		}
		await fs.promises.rename(temp, wav);
		return true;
	} finally { await fs.promises.rm(temp, { force: true }); }
}

export async function speechFile(rawText: string, priority: 'urgent' | 'background', format: 'opus' | 'mp3' = 'opus', config = ttsConfig()): Promise<string | null> {
	const text = normalizeTtsText(rawText);
	if (!text || !config || !await serverTtsAvailable()) return null;
	const pathFor = (ext: 'ogg' | 'mp3' | 'wav') => resolveAudioFile(config.root, ttsCacheName(text, config.model, ext))!;
	const wav = pathFor('wav'), ogg = pathFor('ogg'), mp3 = pathFor('mp3');
	const opus = process.env.TTS_FORMAT !== 'wav' && await ffmpegAvailable();
	if (format === 'mp3' && opus) {
		if (await readable(mp3)) return mp3;
		if (await readable(ogg) || await readable(wav)) return await enqueue(config, text, mp3, 'urgent') && await readable(mp3) ? mp3 : await readable(wav) ? wav : ogg;
	}
	if (opus && await readable(ogg)) return ogg;
	if (await readable(wav)) {
		if (opus) void encode(wav, ogg, 'ogg').catch(() => undefined);
		if (format === 'mp3' && opus) return await enqueue(config, text, mp3, 'urgent') && await readable(mp3) ? mp3 : wav;
		return wav;
	}
	const target = opus ? ogg : wav;
	if (!await enqueue(config, text, target, priority)) return null;
	if (format === 'mp3' && opus && await readable(ogg)) return await enqueue(config, text, mp3, 'urgent') && await readable(mp3) ? mp3 : ogg;
	return await readable(target) ? target : await readable(wav) ? wav : null;
}

export async function synthesizeSpeechFile(rawText: string, format: 'opus' | 'mp3' = 'opus'): Promise<string | null> {
	return speechFile(rawText, 'urgent', format);
}

/** Compatibility for callers that need bytes; the streaming route uses synthesizeSpeechFile. */
export async function synthesizeSpeech(rawText: string): Promise<{ bytes: Buffer; type: string } | null> {
	const file = await synthesizeSpeechFile(rawText);
	if (!file) return null;
	try { return { bytes: await fs.promises.readFile(file), type: audioContentType(file) }; } catch { return null; }
}

/** Synthesize missing speech in the background, in order, so the learner's first tap plays at once. */
export function warmSpeech(texts: string[]): void {
	const config = ttsConfig();
	if (!config) return;
	void (async () => {
		for (const text of new Set(texts)) await speechFile(text, 'background', 'opus', config).catch(() => null);
	})();
}
