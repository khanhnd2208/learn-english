export type WordStatusName = 'new' | 'practicing' | 'mastered';

export interface WordStateSnapshot {
	status: WordStatusName;
	lastExposureAt: Date | null;
	lastTestedAt: Date | null;
	masteredAt: Date | null;
	inMistakeBook: boolean;
	mistakeAddedAt: Date | null;
}

export function emptyWordState(): WordStateSnapshot {
	return {
		status: 'new',
		lastExposureAt: null,
		lastTestedAt: null,
		masteredAt: null,
		inMistakeBook: false,
		mistakeAddedAt: null,
	};
}

/** A word passes only when both its recognize item and its recall item are correct. A blank counts as wrong. */
export function wordPassed(recognizeCorrect: boolean, recallCorrect: boolean): boolean {
	return recognizeCorrect && recallCorrect;
}

export function applyPracticeExposure(state: WordStateSnapshot, now: Date): WordStateSnapshot {
	return {
		...state,
		lastExposureAt: now,
		status: state.status === 'new' ? 'practicing' : state.status,
	};
}

export function applyTestResult(
	state: WordStateSnapshot,
	result: { passed: boolean; counted: boolean },
	now: Date,
): WordStateSnapshot {
	const next: WordStateSnapshot = {
		...state,
		lastExposureAt: now,
		lastTestedAt: now,
		status: state.status === 'new' ? 'practicing' : state.status,
	};
	if (result.passed && result.counted) {
		return { ...next, status: 'mastered', masteredAt: now, inMistakeBook: false };
	}
	if (!result.passed && result.counted) {
		return {
			...next,
			status: 'practicing',
			masteredAt: null,
			inMistakeBook: true,
			mistakeAddedAt: state.mistakeAddedAt ?? now,
		};
	}
	if (!result.passed) {
		return {
			...next,
			inMistakeBook: true,
			mistakeAddedAt: state.mistakeAddedAt ?? now,
		};
	}
	return next;
}
