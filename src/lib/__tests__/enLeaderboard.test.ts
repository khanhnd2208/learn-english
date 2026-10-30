import { describe, expect, it } from 'vitest';
import { avatarUrl, displayName, isActive, podiumOrder, rankScores } from '@/lib/english/leaderboard';

describe('leaderboard rules', () => {
	it('drops non-positive scores and sorts ties by user id', () => {
		expect(rankScores([
			{ userId: 'b', xp: 50 },
			{ userId: 'a', xp: 50 },
			{ userId: 'c', xp: 80 },
			{ userId: 'd', xp: 0 },
		])).toEqual([
			{ userId: 'c', xp: 80, rank: 1 },
			{ userId: 'a', xp: 50, rank: 2 },
			{ userId: 'b', xp: 50, rank: 2 },
		]);
	});

	it('uses standard competition ranks', () => {
		expect(rankScores([
			{ userId: 'a', xp: 10 },
			{ userId: 'b', xp: 10 },
			{ userId: 'c', xp: 5 },
		]).map(({ rank }) => rank)).toEqual([1, 1, 3]);
		expect(rankScores([])).toEqual([]);
	});

	it('marks the inclusive ten-minute activity window', () => {
		const now = new Date('2026-10-30T08:00:00.000Z');
		expect(isActive(new Date(now.getTime() - 10 * 60_000), now)).toBe(true);
		expect(isActive(new Date(now.getTime() - 10 * 60_000 - 1), now)).toBe(false);
		expect(isActive(null, now)).toBe(false);
	});

	it('normalizes display names', () => {
		expect(displayName('  Nguyễn   Văn  A ')).toBe('Nguyễn Văn A');
		expect(displayName('')).toBe('Học viên');
		expect(displayName(null)).toBe('Học viên');
		expect(displayName('a'.repeat(60))).toBe('a'.repeat(40));
	});

	it('prefers uploaded avatars and accepts only https account images', () => {
		const id = '653200000000000000000000';
		expect(avatarUrl(id, { file: 'avatars/x.webp', version: 3 }, 'https://lh3.example/a')).toBe(`/api/avatar/${id}?v=3`);
		expect(avatarUrl(id, { file: null, version: 2 }, 'https://lh3.example/a')).toBe('https://lh3.example/a');
		expect(avatarUrl(id, null, 'http://example.com/a')).toBeNull();
		expect(avatarUrl(id, null, null)).toBeNull();
	});

	it('places the leader in the middle of the podium', () => {
		expect(podiumOrder(['A', 'B', 'C'])).toEqual(['B', 'A', 'C']);
		expect(podiumOrder(['A', 'B'])).toEqual(['B', 'A']);
		expect(podiumOrder(['A'])).toEqual(['A']);
		expect(podiumOrder([])).toEqual([]);
	});
});
