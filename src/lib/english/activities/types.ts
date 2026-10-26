import type { SenseBundle } from '@/lib/english/senseBundle';
import type { DistractorPool } from '@/lib/english/activities/distractors';
import type { Rng } from '@/lib/english/activities/rng';

export const ACTIVITY_KEYS = [
	'meaning_choice',
	'listen_choice',
	'cloze_choice',
	'match_pairs',
	'spell_hinted',
	'recall_type',
	'listen_type',
	'speak_shadow',
] as const;

export type ActivityKey = (typeof ACTIVITY_KEYS)[number];
export type ActivityRole = 'recognize' | 'recall' | 'none';

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
	recallPrompt?: 'meaning' | 'any';
}

export interface ActivityDefinition {
	key: ActivityKey;
	label: string;
	role: ActivityRole;
	inPractice: boolean;
	inTest: boolean;
	sortOrder: number;
	build(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null;
	grade?(item: ActivityItem, answer: string): boolean;
}
