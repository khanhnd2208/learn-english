import { PRACTICE_PATH, type ActivityKey } from '@/lib/english/activities/types';

export interface PracticeStep {
	senseId: string;
	activityKey: ActivityKey;
	delay: number;
}

export function initialPracticeQueue(senseIds: string[], activityKey: ActivityKey | null): PracticeStep[] {
	if (activityKey === 'match_pairs') {
		return senseIds.slice(0, 5).map((senseId) => ({ senseId, activityKey, delay: 0 }));
	}
	if (activityKey) {
		return senseIds.map((senseId) => ({ senseId, activityKey, delay: 0 }));
	}
	return senseIds.map((senseId) => ({ senseId, activityKey: PRACTICE_PATH[0] ?? 'meaning_choice', delay: 0 }));
}

export function takePracticeStep(queue: PracticeStep[]): { current: PracticeStep | null; queue: PracticeStep[] } {
	if (queue.length === 0) return { current: null, queue };
	const ready = queue.findIndex((step) => step.delay <= 0);
	if (ready >= 0) {
		const current = queue[ready] ?? null;
		return { current, queue: queue.filter((_, index) => index !== ready) };
	}
	return takePracticeStep(queue.map((step) => ({ ...step, delay: step.delay - 1 })));
}

export function queueAfterAnswer(queue: PracticeStep[], current: PracticeStep, correct: boolean, path: boolean): PracticeStep[] {
	if (!correct) return [...queue, { ...current, delay: 3 }];
	if (!path) return queue;
	const index = PRACTICE_PATH.indexOf(current.activityKey);
	const next = index >= 0 ? PRACTICE_PATH[index + 1] : undefined;
	if (!next) return queue;
	return [...queue, { senseId: current.senseId, activityKey: next, delay: 0 }];
}
