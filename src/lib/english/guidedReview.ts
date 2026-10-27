import { answerLayout, type AnswerLayout } from '@/lib/english/answerLayout';
import { activityByKey, poolFromBundles, type ActivityItem, type ActivityKey } from '@/lib/english/activities';
import type { Rng } from '@/lib/english/activities/rng';
import type { SenseBundle } from '@/lib/english/senseBundle';

export type ReviewHistory = { senseId: string; attempts: number; recentWrong: number; recentTotal: number };
export type GuidedQuestion = ActivityItem & { layout: AnswerLayout | null };

export function reviewWeight(history: Pick<ReviewHistory, 'attempts' | 'recentWrong' | 'recentTotal'>): number {
	const wrongRate = history.recentTotal > 0 ? history.recentWrong / history.recentTotal : 0;
	return 1 + 3 / Math.sqrt(1 + Math.max(0, history.attempts)) + 3 * wrongRate;
}

export function weightedOrder(senseIds: string[], histories: ReviewHistory[], rng: Rng): string[] {
	const stats = new Map(histories.map((history) => [history.senseId, history]));
	const remaining = [...new Set(senseIds)];
	const ordered: string[] = [];
	while (remaining.length) {
		const weights = remaining.map((senseId) => reviewWeight(stats.get(senseId) ?? { attempts: 0, recentWrong: 0, recentTotal: 0 }));
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		let cursor = rng.next() * total;
		let picked = 0;
		for (let index = 0; index < weights.length; index += 1) {
			cursor -= weights[index]!;
			if (cursor <= 0) { picked = index; break; }
		}
		ordered.push(remaining.splice(picked, 1)[0]!);
	}
	return ordered;
}

const TYPED_KEYS: ActivityKey[] = ['recall_type', 'spell_hinted'];
const CHOICE_KEYS: ActivityKey[] = ['meaning_choice', 'cloze_choice', 'listen_choice'];

function buildOne(bundle: SenseBundle, bundles: SenseBundle[], keys: ActivityKey[], rng: Rng): GuidedQuestion | null {
	const pool = poolFromBundles(bundles, { sameSetIds: new Set(bundles.map((entry) => entry.sense.id)) });
	for (const key of keys) {
		const activity = activityByKey(key);
		const item = activity?.build(bundle, { pool, rng, allowSyntheticAudio: false, recallPrompt: 'any' });
		if (item) return { ...item, layout: TYPED_KEYS.includes(item.activityKey) ? answerLayout(item.answerKey) : null };
	}
	return null;
}

/** One question per word. Full chunks aim for two typed prompts and at least three activity types. */
export function buildGuidedQuestions(chunk: SenseBundle[], poolBundles: SenseBundle[], rng: Rng): GuidedQuestion[] {
	const typedTargets = new Set(rng.shuffle(chunk.map((bundle) => bundle.sense.id)).slice(0, Math.min(2, chunk.length)));
	const used = new Set<ActivityKey>();
	const built = chunk.flatMap((bundle) => {
		const primary = typedTargets.has(bundle.sense.id) ? rng.shuffle(TYPED_KEYS) : rng.shuffle(CHOICE_KEYS);
		const unused = primary.filter((key) => !used.has(key));
		const question = buildOne(bundle, poolBundles, [...unused, ...primary.filter((key) => used.has(key)), ...TYPED_KEYS], rng);
		if (!question) return [];
		used.add(question.activityKey);
		return [question];
	});
	const shuffled = rng.shuffle(built);
	const lastStudied = chunk.at(-1)?.sense.id;
	if (shuffled.length > 1 && shuffled[0]?.senseId === lastStudied) [shuffled[0], shuffled[1]] = [shuffled[1]!, shuffled[0]!];
	return shuffled;
}

export function buildRetryQuestion(bundle: SenseBundle, poolBundles: SenseBundle[], previousKey: string, rng: Rng): GuidedQuestion | null {
	const keys = [...TYPED_KEYS, ...CHOICE_KEYS].filter((key) => key !== previousKey);
	return buildOne(bundle, poolBundles, rng.shuffle(keys), rng);
}
