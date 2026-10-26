import { describe, expect, it } from 'vitest';
import { initialPracticeQueue, queueAfterAnswer, takePracticeStep } from '@/lib/english/practiceLoop';

describe('practice loop', () => {
	it('brings a missed word back after three other questions', () => {
		let queue = initialPracticeQueue(['a', 'b', 'c', 'd', 'e']);
		const order: string[] = [];
		for (let turn = 0; turn < 6; turn += 1) {
			const taken = takePracticeStep(queue);
			if (!taken.current) break;
			order.push(taken.current.senseId);
			queue = queueAfterAnswer(taken.queue, taken.current, taken.current.senseId !== 'a' || order.length > 1);
		}
		expect(order).toEqual(['a', 'b', 'c', 'd', 'a', 'e']);
	});

	it('ends when every word is answered correctly', () => {
		const taken = takePracticeStep(queueAfterAnswer([], { senseId: 'a', delay: 0 }, true));
		expect(taken.current).toBeNull();
	});
});
