import { describe, expect, it } from 'vitest';
import { hintFor } from '@/lib/english/srsPrompt';

describe('SRS spelling hint', () => {
	it('does not count spaces or hyphens', () => {
		expect(hintFor('ice cream')).toEqual({ firstLetter: 'i', letterCount: 8 });
		expect(hintFor('well-known')).toEqual({ firstLetter: 'w', letterCount: 9 });
	});
});
