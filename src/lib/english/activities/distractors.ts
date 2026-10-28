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

/** Prefer authored distractors, then the same part of speech in the same set. Never a confusable or family member. */
export function chooseDistractors(
	sense: SenseBundle,
	pool: DistractorPool,
	count: number,
	preferOutside: boolean,
): PoolEntry[] {
	const blocked = blockedLemmas(sense);
	const self = lemmaKeyOf(sense.word.lemma);
	const eligible = pool.entries.filter((entry) => {
		const key = lemmaKeyOf(entry.lemma);
		return entry.senseId !== sense.sense.id && key !== self && !blocked.has(key) && !entry.synonymKeys.includes(self) && normalizeLearnerText(entry.meaningVi) !== normalizeLearnerText(sense.sense.meaningVi);
	});
	const outside = eligible.filter((entry) => !entry.inTest);
	const ranked = preferOutside && outside.length >= count ? outside : eligible;
	return [...ranked]
		.sort((a, b) => rank(b, sense, preferOutside) - rank(a, sense, preferOutside) || a.lemma.localeCompare(b.lemma))
		.slice(0, count);
}
