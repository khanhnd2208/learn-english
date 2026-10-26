/** A word waiting in an ungraded practice round; `delay` counts questions before a retry may come back. */
export interface PracticeStep {
	senseId: string;
	delay: number;
	retry?: boolean;
}

/** A missed word comes back after this many other questions. */
export const PRACTICE_RETRY_DELAY = 3;

export function initialPracticeQueue(senseIds: string[]): PracticeStep[] {
	return senseIds.map((senseId) => ({ senseId, delay: 0 }));
}

/** Next step: a retry as soon as its delay has passed, otherwise the next word in order. */
export function takePracticeStep(queue: PracticeStep[]): { current: PracticeStep | null; queue: PracticeStep[] } {
	if (queue.length === 0) return { current: null, queue };
	const retry = queue.findIndex((step) => step.retry && step.delay <= 0);
	const fresh = queue.findIndex((step) => step.delay <= 0);
	const index = retry >= 0 ? retry : fresh >= 0 ? fresh : queue.reduce((best, step, at) => (step.delay < queue[best]!.delay ? at : best), 0);
	const current = queue[index] ?? null;
	const rest = queue.filter((_, at) => at !== index).map((step) => ({ ...step, delay: Math.max(0, step.delay - 1) }));
	return { current, queue: rest };
}

export function queueAfterAnswer(queue: PracticeStep[], current: PracticeStep, correct: boolean): PracticeStep[] {
	return correct ? queue : [...queue, { senseId: current.senseId, delay: PRACTICE_RETRY_DELAY, retry: true }];
}
