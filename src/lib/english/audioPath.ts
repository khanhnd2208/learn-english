import { createHash } from 'crypto';
import path from 'path';

/** Audio lives outside the release directory. `ENGLISH_AUDIO_ROOT` points at that shared folder. */
export function englishAudioRoot(): string | null {
	const root = process.env.ENGLISH_AUDIO_ROOT?.trim();
	return root ? root : null;
}

/** Resolve a stored file name inside the audio root. Rejects absolute paths and `..`. */
export function resolveAudioFile(root: string, relativeName: string): string | null {
	const name = relativeName.trim();
	if (!name || name.includes('..') || path.isAbsolute(name)) return null;
	if (name.includes('\0')) return null;
	const rootResolved = path.resolve(root);
	const full = path.resolve(rootResolved, name);
	if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) return null;
	return full;
}

export function audioContentType(fileName: string): string {
	const ext = path.extname(fileName).toLowerCase();
	if (ext === '.wav') return 'audio/wav';
	if (ext === '.ogg') return 'audio/ogg';
	if (ext === '.m4a') return 'audio/mp4';
	return 'audio/mpeg';
}

export type ByteRange = { start: number; end: number };

/** Parse a single HTTP bytes range against a known file size. */
export function parseByteRange(header: string | null, size: number): ByteRange | null {
	if (!header || size <= 0) return null;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match || (!match[1] && !match[2])) return null;

	if (!match[1]) {
		const suffixLength = Number(match[2]);
		if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
		return { start: Math.max(0, size - suffixLength), end: size - 1 };
	}

	const start = Number(match[1]);
	if (!Number.isInteger(start) || start < 0 || start >= size) return null;
	const requestedEnd = match[2] ? Number(match[2]) : size - 1;
	if (!Number.isInteger(requestedEnd) || requestedEnd < start) return null;
	return { start, end: Math.min(requestedEnd, size - 1) };
}

/** Longest text the server will synthesize; lemmas and short phrases fit easily. */
export const TTS_MAX_CHARS = 120;

/** Collapse whitespace and drop control characters. Returns '' when there is nothing to say or it is too long. */
export function normalizeTtsText(text: string): string {
	const clean = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
	return clean.length > 0 && clean.length <= TTS_MAX_CHARS ? clean : '';
}

/** Cache file for synthesized speech, keyed by the voice model and the exact text. */
export function ttsCacheName(text: string, model: string): string {
	const hash = createHash('sha256').update(`${path.basename(model)}\n${text}`).digest('hex').slice(0, 32);
	return path.join('tts', `${hash}.wav`);
}
