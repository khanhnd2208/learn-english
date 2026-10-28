import { describe, expect, it } from 'vitest';
import { todayHeroState } from '@/lib/english/todayHero';

const base = { enrolledSets: 1, learnedCount: 5, dueTotal: 0, dueCount: 0, newCount: 0, xp: 0, goal: 400 };

describe('today hero', () => {
	it('asks a learner without sets to pick one', () => {
		expect(todayHeroState({ ...base, enrolledSets: 0, learnedCount: 0 })).toBe('start');
	});

	it('puts review first while words are waiting, even past the daily goal', () => {
		expect(todayHeroState({ ...base, dueTotal: 12, dueCount: 12 })).toBe('review');
		expect(todayHeroState({ ...base, newCount: 5 })).toBe('review');
		expect(todayHeroState({ ...base, dueTotal: 3, dueCount: 3, xp: 900 })).toBe('review');
	});

	it('offers more learning once review is done', () => {
		expect(todayHeroState({ ...base, xp: 120 })).toBe('more');
	});

	it('celebrates the daily goal once review is done', () => {
		expect(todayHeroState({ ...base, xp: 400 })).toBe('goal');
	});

	it('never shows a review button with nothing to review', () => {
		expect(todayHeroState({ ...base, learnedCount: 0 })).toBe('more');
	});
});
