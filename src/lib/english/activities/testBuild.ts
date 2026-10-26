import type { ActivityItem } from '@/lib/english/activities/types';

/** True when the prompt sent to the learner carries no answer key. */
export function promptHidesAnswer(item: ActivityItem): boolean {
	return !Object.prototype.hasOwnProperty.call(item.prompt, 'answerKey')
		&& !Object.prototype.hasOwnProperty.call(item.prompt, 'answer')
		&& !Object.prototype.hasOwnProperty.call(item.prompt, 'accepted');
}
