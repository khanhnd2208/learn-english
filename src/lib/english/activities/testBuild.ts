import { activityByKey } from '@/lib/english/activities/registry';
import type { ActivityItem, ActivityKey, ActivityRole } from '@/lib/english/activities/types';
import type { DistractorPool } from '@/lib/english/activities/distractors';
import type { Rng } from '@/lib/english/activities/rng';
import type { SenseBundle } from '@/lib/english/senseBundle';

export interface BuiltTest {
	items: ActivityItem[];
	dropped: Array<{ senseId: string; role: ActivityRole }>;
}

function firstBuild(
	sense: SenseBundle,
	kinds: ActivityKey[],
	pool: DistractorPool,
	rng: Rng,
): ActivityItem | null {
	for (const key of rng.shuffle(kinds)) {
		const activity = activityByKey(key);
		if (!activity || activity.role === 'none') continue;
		const item = activity.build(sense, { pool, rng, preferOutsideTest: true });
		if (item) return item;
	}
	return null;
}

/** Recall items come first, in the same shuffled word order as the recognize items that follow. */
export function arrangeRecallBeforeRecognize(items: ActivityItem[], rng: Rng): ActivityItem[] {
	const groups = new Map<string, { recall?: ActivityItem; recognize?: ActivityItem }>();
	for (const item of items) {
		const group = groups.get(item.senseId) ?? {};
		if (item.role === 'recall') group.recall = item;
		if (item.role === 'recognize') group.recognize = item;
		groups.set(item.senseId, group);
	}
	const pairs = [...groups.values()].flatMap((group) => (
		group.recall && group.recognize ? [{ recall: group.recall, recognize: group.recognize }] : []
	));
	const order = rng.shuffle(pairs);
	return [...order.map((pair) => pair.recall), ...order.map((pair) => pair.recognize)];
}

export function buildTest(input: {
	senses: SenseBundle[];
	recognizeKinds: ActivityKey[];
	recallKinds: ActivityKey[];
	pool: DistractorPool;
	rng: Rng;
}): BuiltTest {
	const dropped: BuiltTest['dropped'] = [];
	const built: ActivityItem[] = [];
	for (const sense of input.senses) {
		const recall = firstBuild(sense, input.recallKinds, input.pool, input.rng);
		const recognize = firstBuild(sense, input.recognizeKinds, input.pool, input.rng);
		if (!recall) dropped.push({ senseId: sense.sense.id, role: 'recall' });
		if (!recognize) dropped.push({ senseId: sense.sense.id, role: 'recognize' });
		if (!recall || !recognize) continue;
		built.push(recall, recognize);
	}
	return { items: arrangeRecallBeforeRecognize(built, input.rng), dropped };
}

export function promptHidesAnswer(item: ActivityItem): boolean {
	return !Object.prototype.hasOwnProperty.call(item.prompt, 'answerKey')
		&& !Object.prototype.hasOwnProperty.call(item.prompt, 'answer')
		&& !Object.prototype.hasOwnProperty.call(item.prompt, 'accepted');
}
