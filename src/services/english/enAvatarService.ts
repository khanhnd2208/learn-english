import { randomUUID } from 'node:crypto';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { AppError } from '@/lib/appError';
import { prisma } from '@/lib/prisma';
import { englishAudioRoot, resolveAudioFile } from '@/lib/english/audioPath';
import {
	AVATAR_PIXELS,
	AVATAR_PROBLEM_COPY,
	avatarFileName,
	checkAvatarUpload,
	isUserId,
} from '@/lib/english/avatar';
import { avatarUrl } from '@/lib/english/leaderboard';

export async function saveAvatar(userId: string, file: File): Promise<{ avatarUrl: string }> {
	const problem = checkAvatarUpload(file);
	if (problem) throw new AppError(AVATAR_PROBLEM_COPY[problem], 400);
	const root = englishAudioRoot();
	if (!root) throw new AppError(AVATAR_PROBLEM_COPY.unavailable, 503);

	let output: Buffer;
	try {
		const buffer = Buffer.from(await file.arrayBuffer());
		output = await sharp(buffer, { limitInputPixels: 40_000_000 })
			.rotate()
			.resize(AVATAR_PIXELS, AVATAR_PIXELS, { fit: 'cover' })
			.webp({ quality: 82 })
			.toBuffer();
	} catch {
		throw new AppError(AVATAR_PROBLEM_COPY.unreadable, 400);
	}

	const name = avatarFileName(userId);
	const target = resolveAudioFile(root, name);
	if (!target) throw new AppError(AVATAR_PROBLEM_COPY.unavailable, 503);
	await mkdir(dirname(target), { recursive: true });
	const temporary = `${target}.${randomUUID()}.tmp`;
	await writeFile(temporary, output);
	await rename(temporary, target);

	const profile = await prisma.enLearnerProfile.upsert({
		where: { userId },
		create: { userId, avatarFile: name, avatarVersion: 1 },
		update: { avatarFile: name, avatarVersion: { increment: 1 } },
		select: { avatarVersion: true },
	});
	return { avatarUrl: `/api/avatar/${userId}?v=${profile.avatarVersion}` };
}

export async function removeAvatar(userId: string): Promise<void> {
	await prisma.enLearnerProfile.upsert({
		where: { userId },
		create: { userId, avatarFile: null, avatarVersion: 1 },
		update: { avatarFile: null, avatarVersion: { increment: 1 } },
	});
	const root = englishAudioRoot();
	if (!root) return;
	const target = resolveAudioFile(root, avatarFileName(userId));
	if (!target) return;
	try {
		await unlink(target);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
}

export async function readAvatar(targetUserId: string): Promise<{ file: string; size: number; etag: string }> {
	if (!isUserId(targetUserId)) throw new AppError('Không tìm thấy ảnh', 404);
	const profile = await prisma.enLearnerProfile.findUnique({
		where: { userId: targetUserId },
		select: { avatarFile: true, avatarVersion: true },
	});
	const root = englishAudioRoot();
	if (!profile?.avatarFile || !root) throw new AppError('Không tìm thấy ảnh', 404);
	const file = resolveAudioFile(root, profile.avatarFile);
	if (!file) throw new AppError('Không tìm thấy ảnh', 404);
	try {
		const details = await stat(file);
		return { file, size: details.size, etag: `"${targetUserId}-${profile.avatarVersion}"` };
	} catch {
		throw new AppError('Không tìm thấy ảnh', 404);
	}
}

export async function getAvatarState(userId: string, image: string | null | undefined): Promise<{ avatarUrl: string | null; hasUpload: boolean }> {
	const profile = await prisma.enLearnerProfile.findUnique({
		where: { userId },
		select: { avatarFile: true, avatarVersion: true },
	});
	return {
		avatarUrl: avatarUrl(userId, profile ? { file: profile.avatarFile, version: profile.avatarVersion } : null, image),
		hasUpload: !!profile?.avatarFile,
	};
}
