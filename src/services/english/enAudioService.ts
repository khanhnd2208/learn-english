import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { audioContentType, englishAudioRoot, ttsCacheName, spokenText, resolveAudioFile } from '@/lib/english/audioPath';
import { cardExampleOf, type SenseBundle } from '@/lib/english/senseBundle';
import { synthesizeSpeechFile, warmSpeech } from '@/services/english/enTtsService';

export async function audioFileExists(relativeName: string): Promise<boolean> {
	const root = englishAudioRoot();
	if (!root) return false;
	const full = resolveAudioFile(root, relativeName);
	if (!full) return false;
	try {
		await fs.promises.access(full, fs.constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function readInsideRoot(relativeName: string): Promise<string | null> {
	const root = englishAudioRoot();
	if (!root || !relativeName.trim()) return null;
	const full = resolveAudioFile(root, relativeName);
	if (!full) return null;
	try { await fs.promises.access(full, fs.constants.R_OK); return full; } catch { return null; }
}

/** Audio of a word in a downloaded set, or in an open store set (listed, no password). */
function audibleSense(viewer: { userId: string; admin: boolean }) {
	if (viewer.admin) return {};
	return { setItems: { some: { set: { status: 'published' as const, OR: [
		{ enrollments: { some: { userId: viewer.userId } } },
		{ listed: true, accessCode: null },
	] } } } };
}

export async function readEnglishAudio(query: {
	senseId?: string | null;
	exampleId?: string | null;
	format?: 'opus' | 'mp3';
}, viewer: { userId: string; admin: boolean }): Promise<{ file: string; size: number; type: string; etag: string }> {
	if (query.senseId) {
		const sense = await prisma.enSense.findFirst({
			where: { id: query.senseId, status: 'published', ...audibleSense(viewer) },
			include: { word: { select: { lemma: true, audioPath: true } } },
		});
		const audioName = sense?.word.audioPath || '';
		// A recorded file wins; otherwise the server speaks the word itself.
		const file = sense ? await readInsideRoot(audioName) ?? await synthesizeSpeechFile(spokenText(sense.word.lemma), query.format) : null;
		if (!file) throw new AppError('Chưa có audio cho từ này', 404);
		return fileInfo(file);
	}
	if (query.exampleId) {
		const example = await prisma.enExample.findFirst({
			where: { id: query.exampleId, status: 'published', sense: audibleSense(viewer) },
			select: { english: true, target: true },
		});
		const file = example ? await synthesizeSpeechFile(exampleSpeechText(example), query.format) : null;
		if (!file) throw new AppError('Chưa có audio cho câu ví dụ', 404);
		return fileInfo(file);
	}
	throw new AppError('Thiếu nội dung audio', 400);
}

async function fileInfo(file: string) {
	const size = (await fs.promises.stat(file)).size;
	const etag = `"${path.basename(file, path.extname(file))}-${size}"`;
	return { file, size, type: audioContentType(file), etag };
}

export async function setSpeechTexts(setId: string): Promise<string[]> {
	const set = await prisma.enSet.findFirst({ where: { id: setId, status: 'published' }, select: { items: { where: { sense: { status: 'published' } }, select: { sense: { select: { word: { select: { lemma: true, audioPath: true } }, examples: { where: { status: 'published' }, select: { english: true, target: true } } } } } } } });
	if (!set) throw new AppError('Không tìm thấy bộ đã xuất bản', 404);
	return [...new Set(set.items.flatMap((item) => {
		const sense = item.sense;
		return sense ? [...(sense.word.audioPath ? [] : [spokenText(sense.word.lemma)]), ...sense.examples.map(exampleSpeechText)] : [];
	}))];
}

export async function warmSet(setId: string): Promise<number> {
	const texts = await setSpeechTexts(setId);
	warmSpeech(texts);
	return texts.length;
}

export async function audioCoverage(setId: string): Promise<{ total: number; ready: number }> {
	const texts = await setSpeechTexts(setId);
	const root = englishAudioRoot();
	const model = process.env.PIPER_MODEL?.trim();
	let ready = 0;
	if (root && model) for (const text of texts) {
		for (const ext of ['ogg', 'wav'] as const) if (await audioFileExists(ttsCacheName(text, model, ext))) { ready++; break; }
	}
	return { total: texts.length, ready };
}

function exampleSpeechText(example: { english: string; target: string }): string {
	return spokenText(example.english.replace('___', example.target));
}

/** Prepare the word and card sentence of each bundle, in study order, before the learner taps them. */
export function warmBundleSpeech(bundles: SenseBundle[]): void {
	warmSpeech(bundles.flatMap((bundle) => {
		const example = cardExampleOf(bundle.examples);
		return [
			...(bundle.word.audioPath.trim() ? [] : [spokenText(bundle.word.lemma)]),
			...(example ? [exampleSpeechText(example)] : []),
		];
	}));
}
