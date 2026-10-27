import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { audioContentType, englishAudioRoot, resolveAudioFile } from '@/lib/english/audioPath';

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

async function readInsideRoot(relativeName: string): Promise<{ bytes: Buffer; type: string } | null> {
	const root = englishAudioRoot();
	if (!root || !relativeName.trim()) return null;
	const full = resolveAudioFile(root, relativeName);
	if (!full) return null;
	try {
		const bytes = await fs.promises.readFile(full);
		return { bytes, type: audioContentType(full) };
	} catch {
		return null;
	}
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
}, viewer: { userId: string; admin: boolean }): Promise<{ bytes: Buffer; type: string }> {
	if (query.senseId) {
		const sense = await prisma.enSense.findFirst({
			where: { id: query.senseId, status: 'published', ...audibleSense(viewer) },
			include: { word: { select: { audioPath: true, audioUkPath: true, audioUsPath: true } } },
		});
		const audioName = sense?.word.audioPath || sense?.word.audioUkPath || sense?.word.audioUsPath || '';
		const file = sense ? await readInsideRoot(audioName) : null;
		if (!file) throw new AppError('Chưa có audio cho từ này', 404);
		return file;
	}
	if (query.exampleId) {
		const example = await prisma.enExample.findFirst({
			where: { id: query.exampleId, status: 'published', sense: audibleSense(viewer) },
			select: { audioPath: true },
		});
		const file = example ? await readInsideRoot(example.audioPath) : null;
		if (!file) throw new AppError('Chưa có audio cho câu ví dụ', 404);
		return file;
	}
	throw new AppError('Thiếu nội dung audio', 400);
}
