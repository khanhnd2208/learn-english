import { describe, expect, it } from 'vitest';
import { AVATAR_MAX_BYTES, avatarFileName, checkAvatarUpload, isUserId } from '@/lib/english/avatar';

describe('avatar rules', () => {
	it('accepts only lowercase Mongo ObjectId hex', () => {
		expect(isUserId('a'.repeat(24))).toBe(true);
		expect(isUserId('A'.repeat(24))).toBe(false);
		expect(isUserId('a'.repeat(23))).toBe(false);
		expect(isUserId('../x')).toBe(false);
	});

	it('builds the stored avatar file name', () => {
		const id = 'abc000000000000000000000';
		expect(avatarFileName(id)).toBe(`avatars/${id}.webp`);
	});

	it('validates size and content type', () => {
		expect(checkAvatarUpload({ size: 0, type: 'image/png' })).toBe('empty');
		expect(checkAvatarUpload({ size: AVATAR_MAX_BYTES, type: 'image/png' })).toBeNull();
		expect(checkAvatarUpload({ size: AVATAR_MAX_BYTES + 1, type: 'image/png' })).toBe('too_big');
		expect(checkAvatarUpload({ size: 100, type: 'image/gif' })).toBe('bad_type');
	});
});
