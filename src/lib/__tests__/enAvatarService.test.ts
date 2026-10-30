import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const mocks = vi.hoisted(() => ({ upsert: vi.fn(), findUnique: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
	prisma: { enLearnerProfile: { upsert: mocks.upsert, findUnique: mocks.findUnique } },
}));

import { AVATAR_MAX_BYTES } from '@/lib/english/avatar';
import { readAvatar, removeAvatar, saveAvatar } from '@/services/english/enAvatarService';

const userId = 'a'.repeat(24);
let root = '';
let previousRoot: string | undefined;

beforeEach(async () => {
	vi.clearAllMocks();
	previousRoot = process.env.ENGLISH_AUDIO_ROOT;
	root = await mkdtemp(join(tmpdir(), 'learn-english-avatar-'));
	process.env.ENGLISH_AUDIO_ROOT = root;
	mocks.upsert.mockResolvedValue({ avatarVersion: 2 });
	mocks.findUnique.mockResolvedValue(null);
});

afterEach(async () => {
	if (previousRoot === undefined) delete process.env.ENGLISH_AUDIO_ROOT;
	else process.env.ENGLISH_AUDIO_ROOT = previousRoot;
	await rm(root, { recursive: true, force: true });
});

describe('avatar service', () => {
	it('normalizes an uploaded image to a square WebP and bumps the version', async () => {
		const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
		const result = await saveAvatar(userId, new File([png], 'a.png', { type: 'image/png' }));
		const stored = join(root, 'avatars', `${userId}.webp`);
		const metadata = await sharp(await readFile(stored)).metadata();
		expect(metadata).toMatchObject({ width: 256, height: 256, format: 'webp' });
		expect(mocks.upsert.mock.calls[0]?.[0].update.avatarVersion).toEqual({ increment: 1 });
		expect(result.avatarUrl).toBe(`/api/avatar/${userId}?v=2`);
	});

	it('rejects files over 2 MB before writing', async () => {
		const file = new File([Buffer.alloc(AVATAR_MAX_BYTES + 1)], 'large.png', { type: 'image/png' });
		await expect(saveAvatar(userId, file)).rejects.toMatchObject({ status: 400, message: 'Ảnh lớn hơn 2 MB.' });
		expect(mocks.upsert).not.toHaveBeenCalled();
	});

	it('rejects unreadable image contents', async () => {
		const file = new File(['not an image'], 'bad.png', { type: 'image/png' });
		await expect(saveAvatar(userId, file)).rejects.toMatchObject({ status: 400, message: 'Không đọc được ảnh này. Hãy thử ảnh khác.' });
	});

	it('reports an unavailable storage root', async () => {
		process.env.ENGLISH_AUDIO_ROOT = '';
		const file = new File(['x'], 'a.png', { type: 'image/png' });
		await expect(saveAvatar(userId, file)).rejects.toMatchObject({ status: 503, message: 'Chưa thể lưu ảnh lúc này.' });
	});

	it('removes the database pointer even when no file exists', async () => {
		await expect(removeAvatar(userId)).resolves.toBeUndefined();
		expect(mocks.upsert.mock.calls[0]?.[0]).toMatchObject({ update: { avatarFile: null, avatarVersion: { increment: 1 } } });
	});

	it('returns 404 for invalid ids and profiles without an upload', async () => {
		await expect(readAvatar('../etc')).rejects.toMatchObject({ status: 404, message: 'Không tìm thấy ảnh' });
		await expect(readAvatar(userId)).rejects.toMatchObject({ status: 404, message: 'Không tìm thấy ảnh' });
	});
});
