import { dueAt, scheduleAnswer } from '@/lib/english/schedule';

export const EN_APPEAL_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type AppealStatus = (typeof EN_APPEAL_STATUSES)[number];
/** Appeals must be sent soon after the answer, while the learner still remembers it. */
export const EN_APPEAL_WINDOW_DAYS = 7;

/** Box a correct answer would have reached from this box. */
export function correctBox(boxBefore: number): number { return scheduleAnswer({ box: boxBefore, lapses: 0 }, true).box; }

type Review = { at: Date; boxBefore: number; scheduled: boolean };
type State = { box: number; lapses: number; dueAt: Date; lastReviewedAt: Date | null };

/**
 * Schedule after an accepted appeal: the review counts as correct.
 * Untouched since the review → the exact schedule a correct answer would have given.
 * Reviewed again later → only lift the box if it is still below that, never lower it.
 * Returns null when nothing should change (the answer did not move the schedule).
 */
export function restoredSchedule(review: Review, current: State | null, now: Date): { box: number; lapses: number; dueAt: Date } | null {
	if (!review.scheduled || !current) return null;
	const fixedBox = correctBox(review.boxBefore);
	const lapses = Math.max(0, current.lapses - (review.boxBefore > 0 ? 1 : 0));
	const untouched = current.lastReviewedAt?.getTime() === review.at.getTime();
	if (untouched) return { box: fixedBox, lapses, dueAt: dueAt(fixedBox, review.at) };
	if (current.box < fixedBox) return { box: fixedBox, lapses, dueAt: dueAt(fixedBox, now) };
	return lapses === current.lapses ? null : { box: current.box, lapses, dueAt: current.dueAt };
}
