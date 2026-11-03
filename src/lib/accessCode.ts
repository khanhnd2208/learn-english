import { createHash, timingSafeEqual } from 'node:crypto';

export function accessCodeMatches(expected: string, actual: string): boolean {
	const expectedHash = createHash('sha256').update(expected.trim().toLocaleLowerCase('vi')).digest();
	const actualHash = createHash('sha256').update(actual.trim().toLocaleLowerCase('vi')).digest();
	return timingSafeEqual(expectedHash, actualHash);
}
