// Frozen copy used only as a parity oracle. Do not edit.
import { EN_LEITNER_INTERVALS } from '@/lib/english/constants';
import { randomRng, type Rng } from '@/lib/english/activities/rng';
import { shiftVnDay, vnDayKey } from '@/lib/english/gapRule';
import { normalizeLearnerText } from '@/lib/english/text';

export type ScheduledState = {
	id: string;
	senseId: string;
	box: number;
	dueAt: Date;
	lapses: number;
	introducedAt: Date;
	lastReviewedAt: Date | null;
};

export type DailyQueueItem =
	| { kind: 'review'; state: ScheduledState }
	| { kind: 'new'; senseId: string };

export type LearningStage = 'new' | 'learning' | 'remembering' | 'long_term';

const LONG_TERM_BOX = 4;

export function nextBox(box: number, correct: boolean): number {
	if (!correct) return Math.max(1, Math.max(0, box) - 1);
	return Math.min(EN_LEITNER_INTERVALS.length - 1, Math.max(0, box) + 1);
}

/**
 * Box after a scheduled answer. A word in box 0 has never been recalled on a schedule,
 * so a correct first answer starts at box 2 (the learner already knew it) and
 * never counts as a lapse.
 */
export function scheduleAnswer(state: { box: number; lapses: number } | null, correct: boolean): { box: number; lapses: number } {
	const box = state?.box ?? 0;
	const lapses = state?.lapses ?? 0;
	if (box <= 0) return { box: correct ? 2 : 1, lapses };
	return { box: nextBox(box, correct), lapses: correct ? lapses : lapses + 1 };
}

/**
 * Answers before a word is due are ignored, which protects against stale or duplicate
 * requests. Due words and new words always move to a new schedule.
 */
export function scheduleMove(state: Pick<ScheduledState, 'box' | 'lapses' | 'dueAt'> | null, correct: boolean, now: Date) {
	const box = state?.box ?? 0;
	const lapses = state?.lapses ?? 0;
	const waiting = Boolean(state) && box > 0 && state!.dueAt > now;
	if (waiting) return { box, lapses, dueAt: state!.dueAt, scheduled: false };
	const next = scheduleAnswer(state, correct);
	return { ...next, dueAt: dueAt(next.box, now), scheduled: true };
}

export function intervalChange(boxBefore: number, boxAfter: number): { fromDays: number; toDays: number; direction: 'up' | 'down' | 'same' } {
	const fromDays = intervalDays(boxBefore);
	const toDays = intervalDays(boxAfter);
	return { fromDays, toDays, direction: toDays > fromDays ? 'up' : toDays < fromDays ? 'down' : 'same' };
}

/** Start of the due day in Vietnam, so a word due "tomorrow" is available from 00:00 local time. */
export function dueAt(box: number, from: Date): Date {
	const safeBox = Math.min(EN_LEITNER_INTERVALS.length - 1, Math.max(0, Math.trunc(box)));
	const interval = EN_LEITNER_INTERVALS[safeBox] ?? 0;
	return vnDayStart(shiftVnDay(vnDayKey(from), interval));
}

export function vnDayStart(day: string): Date {
	return new Date(`${day}T00:00:00+07:00`);
}

export function isDue(state: Pick<ScheduledState, 'dueAt'>, now = new Date()): boolean {
	return state.dueAt.getTime() <= now.getTime();
}

export function stageOf(box: number | null | undefined): LearningStage {
	if (!box || box <= 0) return 'new';
	if (box === 1) return 'learning';
	if (box < LONG_TERM_BOX) return 'remembering';
	return 'long_term';
}

export function countStages(boxes: (number | undefined)[]) {
	const counts = { new: 0, learning: 0, remembering: 0, longTerm: 0 };
	for (const box of boxes) {
		const stage = stageOf(box);
		if (stage === 'long_term') counts.longTerm += 1;
		else counts[stage] += 1;
	}
	return counts;
}

export function isLongTerm(box: number): boolean {
	return box >= LONG_TERM_BOX;
}

/** Days until the next review for a box, for learner-facing copy such as "Ôn lại sau 3 ngày". */
export function intervalDays(box: number): number {
	return EN_LEITNER_INTERVALS[Math.min(EN_LEITNER_INTERVALS.length - 1, Math.max(0, box))] ?? 0;
}

/**
 * Every due word, then every word of the downloaded sets that is not scheduled yet.
 * SRS has no daily cap: correct answers push words further out, so the queue shrinks on
 * its own, and a learner who cannot finish simply continues next time.
 * Words within the same box are shuffled so they never appear in upload order.
 */
export function buildDailyQueue<T extends ScheduledState>(states: T[], newPool: string[], now = new Date(), rng?: Rng): DailyQueueItem[] {
	const dueStates = states.filter((state) => isDue(state, now));
	if (rng) {
		const shuffled = rng.shuffle(dueStates);
		shuffled.sort((a, b) => a.box - b.box);
		dueStates.splice(0, dueStates.length, ...shuffled);
	} else {
		dueStates.sort((a, b) => a.box - b.box || a.dueAt.getTime() - b.dueAt.getTime() || a.senseId.localeCompare(b.senseId));
	}
	const seen = new Set(states.map((state) => state.senseId));
	const newWords = [...new Set(newPool)].filter((senseId) => !seen.has(senseId));
	return [...dueStates.map((state) => ({ kind: 'review' as const, state })), ...newWords.map((senseId) => ({ kind: 'new' as const, senseId }))];
}

/**
 * New words from every downloaded set, taking one word from each set in turn, so every set
 * reaches the learner early instead of waiting behind the sets downloaded before it.
 * Words already scheduled are skipped before the turns are taken, and each set's words are
 * shuffled when an `rng` is given so learners never study in upload order.
 */
export function interleaveNewWords(groups: string[][], scheduled: Iterable<string> = [], rng?: Rng): string[] {
	const seen = new Set(scheduled);
	const queues = groups.map((group) => {
		const filtered = group.filter((senseId) => {
			if (seen.has(senseId)) return false;
			seen.add(senseId);
			return true;
		});
		return rng ? rng.shuffle(filtered) : filtered;
	});
	const pool: string[] = [];
	for (let turn = 0; queues.some((queue) => turn < queue.length); turn += 1) {
		const turnQueues = rng ? rng.shuffle(queues) : queues;
		for (const queue of turnQueues) if (turn < queue.length) pool.push(queue[turn]!);
	}
	return pool;
}

export { randomRng };

/** Edit distance where swapping two neighbouring letters ("recieve") counts as one typo. */
function editDistance(a: string, b: string): number {
	const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
	for (let i = 1; i <= a.length; i += 1) {
		for (let j = 1; j <= b.length; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			const row = rows[i]!;
			row[j] = Math.min(rows[i - 1]![j]! + 1, row[j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j]!, rows[i - 2]![j - 2]! + 1);
		}
	}
	return rows[a.length]![b.length]!;
}

/** A typo close enough to an accepted answer that the learner deserves one chance to fix it. */
export function isNearMiss(answer: string, accepted: string[]): boolean {
	const given = normalizeLearnerText(answer);
	if (given.length < 3) return false;
	return accepted.some((candidate) => {
		const expected = normalizeLearnerText(candidate);
		if (expected.length < 4 || expected === given) return false;
		const allowed = expected.length >= 8 ? 2 : 1;
		return Math.abs(expected.length - given.length) <= allowed && editDistance(given, expected) <= allowed;
	});
}
