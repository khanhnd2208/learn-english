import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/english/activities/rng';
import { pickReviewSenses, type ReviewCandidate } from '@/lib/english/reviewPick';

function row(partial: Partial<ReviewCandidate> & Pick<ReviewCandidate, 'senseId'>): ReviewCandidate {
	return { inMistakeBook: false, mistakeAddedAt: null, lastExposureAt: null, ...partial };
}

describe('pickReviewSenses', () => {
	it('takes the oldest mistake-book words, then the least recently seen, then random', () => {
		const states = [
			row({ senseId: 'fresh', lastExposureAt: null }),
			row({ senseId: 'old', lastExposureAt: new Date('2026-01-01') }),
			row({ senseId: 'new-miss', inMistakeBook: true, mistakeAddedAt: new Date('2026-10-02'), lastExposureAt: new Date('2026-10-02') }),
			row({ senseId: 'old-miss', inMistakeBook: true, mistakeAddedAt: new Date('2026-09-01'), lastExposureAt: new Date('2026-10-20') }),
			row({ senseId: 'mid', lastExposureAt: new Date('2026-08-01') }),
		];
		const picked = pickReviewSenses(states, 4, mulberry32(1)).map((item) => item.senseId);
		expect(picked).toEqual(['old-miss', 'new-miss', 'old', 'mid']);
		expect(pickReviewSenses(states, 5, mulberry32(2))).toHaveLength(5);
	});
});
