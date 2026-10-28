import type { SenseBundle } from '@/lib/english/senseBundle';
import type { DistractorPool } from '@/lib/english/activities/distractors';
import type { Rng } from '@/lib/english/activities/rng';

export const ACTIVITY_KEYS = ['meaning_choice', 'listen_type', 'cloze_choice'] as const;
export type ActivityKey = (typeof ACTIVITY_KEYS)[number];
export type ActivityRole = 'recognize' | 'recall';

export interface ActivityItem {
	activityKey: ActivityKey;
	role: ActivityRole;
	senseId: string;
	prompt: Record<string, unknown>;
	answerKey: string;
	accepted: string[];
}

export interface ActivityContext {
	pool: DistractorPool;
	rng: Rng;
	preferOutsideTest?: boolean;
	allowSyntheticAudio?: boolean;
}

export interface ActivityDefinition {
	key: ActivityKey;
	label: string;
	role: ActivityRole;
	build(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null;
	grade(item: ActivityItem, answer: string): boolean;
}
