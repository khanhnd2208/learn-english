export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_PIXELS = 256;
export const AVATAR_CHANGED_EVENT = 'english-avatar-changed';

export type AvatarProblem = 'empty' | 'too_big' | 'bad_type';

/** Mongo ObjectId hex. */
export function isUserId(value: string): boolean {
	return /^[a-f0-9]{24}$/.test(value);
}

export function avatarFileName(userId: string): string {
	return `avatars/${userId}.webp`;
}

export function checkAvatarUpload(file: { size: number; type: string }): AvatarProblem | null {
	if (file.size === 0) return 'empty';
	if (file.size > AVATAR_MAX_BYTES) return 'too_big';
	if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'bad_type';
	return null;
}

export const AVATAR_PROBLEM_COPY: Record<AvatarProblem | 'unreadable' | 'unavailable' | 'failed', string> = {
	empty: 'Hãy chọn một ảnh.',
	too_big: 'Ảnh lớn hơn 2 MB.',
	bad_type: 'Chỉ nhận ảnh JPG, PNG hoặc WebP.',
	unreadable: 'Không đọc được ảnh này. Hãy thử ảnh khác.',
	unavailable: 'Chưa thể lưu ảnh lúc này.',
	failed: 'Chưa lưu được ảnh. Hãy thử lại.',
};
