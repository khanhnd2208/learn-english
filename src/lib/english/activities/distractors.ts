import type { SenseBundle } from '@/lib/english/senseBundle';
import { lemmaKeyOf, normalizeLearnerText } from '@/lib/english/text';

export interface PoolEntry {
	senseId: string;
	lemma: string;
	meaningVi: string;
	partOfSpeech: string;
	sameSet: boolean;
	inTest: boolean;
	synonymKeys: string[];
}

export interface DistractorPool {
	entries: PoolEntry[];
}

export function blockedLemmas(sense: SenseBundle): Set<string> {
	return new Set(sense.sense.synonyms.map(lemmaKeyOf));
}

export function poolFromBundles(
	bundles: SenseBundle[],
	options: { inTestIds?: Set<string>; sameSetIds?: Set<string> } = {},
): DistractorPool {
	return {
		entries: bundles.map((bundle) => ({
			senseId: bundle.sense.id,
			lemma: bundle.word.lemma,
			meaningVi: bundle.sense.meaningVi,
			partOfSpeech: bundle.sense.partOfSpeech,
			sameSet: options.sameSetIds ? options.sameSetIds.has(bundle.sense.id) : true,
			inTest: options.inTestIds?.has(bundle.sense.id) ?? false,
			synonymKeys: bundle.sense.synonyms.map(lemmaKeyOf),
		})),
	};
}

function rank(entry: PoolEntry, sense: SenseBundle, preferOutside: boolean): number {
	let score = 0;
	if (entry.partOfSpeech && entry.partOfSpeech === sense.sense.partOfSpeech) score += 20;
	if (entry.sameSet) score += 10;
	if (preferOutside && !entry.inTest) score += 5;
	if (preferOutside && entry.inTest) score -= 5;
	return score;
}

// Same ordering as `String#localeCompare`, without rebuilding a collator per comparison.
const collator = new Intl.Collator();
// Pools hold thousands of entries and are reused for every question in a chunk.
const entryKeys = new WeakMap<PoolEntry, { lemma: string; meaning: string }>();

function keysOf(entry: PoolEntry) {
	let keys = entryKeys.get(entry);
	if (!keys) entryKeys.set(entry, keys = { lemma: lemmaKeyOf(entry.lemma), meaning: normalizeLearnerText(entry.meaningVi) });
	return keys;
}

/** Prefer authored distractors, then the same part of speech in the same set. Never a confusable or family member. */
export function chooseDistractors(
	sense: SenseBundle,
	pool: DistractorPool,
	count: number,
	preferOutside: boolean,
): PoolEntry[] {
	const blocked = blockedLemmas(sense);
	const self = lemmaKeyOf(sense.word.lemma);
	const selfMeaning = normalizeLearnerText(sense.sense.meaningVi);
	const eligible = pool.entries.filter((entry) => {
		const keys = keysOf(entry);
		return entry.senseId !== sense.sense.id && keys.lemma !== self && !blocked.has(keys.lemma) && !entry.synonymKeys.includes(self) && keys.meaning !== selfMeaning;
	});
	const outside = eligible.filter((entry) => !entry.inTest);
	const ranked = preferOutside && outside.length >= count ? outside : eligible;
	if (count <= 0) return [];
	// The first `count` of a stable sort by rank, then lemma: equal entries keep pool order.
	const top: Array<{ entry: PoolEntry; score: number }> = [];
	const before = (a: { entry: PoolEntry; score: number }, b: { entry: PoolEntry; score: number }) => b.score - a.score || collator.compare(a.entry.lemma, b.entry.lemma);
	for (const entry of ranked) {
		const item = { entry, score: rank(entry, sense, preferOutside) };
		if (top.length >= count && before(item, top[top.length - 1]!) >= 0) continue;
		let at = top.length;
		while (at > 0 && before(item, top[at - 1]!) < 0) at -= 1;
		top.splice(at, 0, item);
		if (top.length > count) top.pop();
	}
	return top.map((item) => item.entry);
}
