import { expect, it } from 'vitest';
import { ACTIVITY_KEYS, activityByKey, poolFromBundles, mulberry32, chooseDistractors } from '@/lib/english/activities';
import { bundle } from './fixtures/bundle';
it('supports only the three activities and grades examples only', () => { expect(ACTIVITY_KEYS).toEqual(['meaning_choice','listen_type','cloze_choice']); const all = [1,2,3,4,5].map(bundle); const ctx = { pool: poolFromBundles(all), rng: mulberry32(4), allowSyntheticAudio: true }; const target = all[0]!; expect(activityByKey('listen_type')!.build(target, ctx)?.prompt.meaningVi).toBe(target.sense.meaningVi); expect(activityByKey('cloze_choice')!.build(target, ctx)).not.toBeNull(); target.examples[1]!.role = 'study'; expect(activityByKey('cloze_choice')!.build(target, ctx)).toBeNull(); });
it('excludes synonyms in either direction and identical meanings', () => { const all = [1,2,3,4,5].map(bundle); all[0]!.sense.synonyms = ['word2']; all[2]!.sense.synonyms = ['word1']; all[3]!.sense.meaningVi = all[0]!.sense.meaningVi; expect(chooseDistractors(all[0]!, poolFromBundles(all), 9, false).map((x) => x.lemma)).toEqual(['word5']); });

it('builds cloze choices from examples with an explicit blank', () => { const all = [1,2,3,4].map(bundle); all[0]!.examples[1]!.english = 'We need ___ today.'; all[0]!.examples[1]!.targetStart = null; all[0]!.examples[1]!.targetLength = null; expect(activityByKey('cloze_choice')!.build(all[0]!, { pool: poolFromBundles(all), rng: mulberry32(4) })?.answerKey).toBe('word1'); });

it('picks the same distractors as a full stable sort by rank then lemma', () => {
	const rng = mulberry32(7);
	const all = Array.from({ length: 300 }, (_, i) => bundle(i));
	for (const item of all) {
		item.sense.partOfSpeech = rng.next() < 0.5 ? 'noun' : 'verb';
		item.word.lemma = ['able', 'Able', 'bake', 'cake', 'ábc', 'zeta'][Math.floor(rng.next() * 6)]! + (rng.next() < 0.5 ? '' : ` ${Math.floor(rng.next() * 20)}`);
	}
	const inTestIds = new Set(all.filter(() => rng.next() < 0.3).map((item) => item.sense.id));
	const sameSetIds = new Set(all.filter(() => rng.next() < 0.6).map((item) => item.sense.id));
	const pool = poolFromBundles(all, { inTestIds, sameSetIds });
	for (const preferOutside of [false, true]) {
		for (const target of all.slice(0, 40)) {
			const rank = (entry: typeof pool.entries[number]) => (entry.partOfSpeech === target.sense.partOfSpeech ? 20 : 0) + (entry.sameSet ? 10 : 0) + (preferOutside ? (entry.inTest ? -5 : 5) : 0);
			const eligible = pool.entries.filter((entry) => entry.senseId !== target.sense.id && entry.lemma.trim().toLowerCase().replace(/\s+/g, ' ') !== target.word.lemma.trim().toLowerCase().replace(/\s+/g, ' '));
			const outside = eligible.filter((entry) => !entry.inTest);
			const expected = [...(preferOutside && outside.length >= 8 ? outside : eligible)].sort((a, b) => rank(b) - rank(a) || a.lemma.localeCompare(b.lemma)).slice(0, 8);
			expect(chooseDistractors(target, pool, 8, preferOutside)).toEqual(expected);
		}
	}
});
