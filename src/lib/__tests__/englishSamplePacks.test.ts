import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assessEnglishPack } from '@/lib/english/contentValidation';

const SAMPLE_FILES = [
	'docs/testing/english-sample-packs/travel.json',
	'docs/testing/english-sample-packs/food.json',
] as const;

describe('English local sample packs', () => {
	it.each(SAMPLE_FILES)('%s follows the current schema and contains 10 publishable words', (relativePath) => {
		const input: unknown = JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
		const assessment = assessEnglishPack(input);

		expect(assessment.schemaError).toBeNull();
		expect(assessment.pack?.words).toHaveLength(10);
		expect(assessment.words).toHaveLength(10);
		expect(assessment.words.every((word) => word.publishable)).toBe(true);
		for (const word of assessment.pack?.words ?? []) {
			const confusables = new Set([
				...word.relations.filter((relation) => relation.kind === 'confusable').map((relation) => relation.lemma),
				...(assessment.pack?.words ?? [])
					.filter((other) => other.relations.some((relation) => relation.kind === 'confusable' && relation.lemma === word.lemma))
					.map((other) => other.lemma),
			]);
			expect(word.distractorLemmas.filter((lemma) => confusables.has(lemma))).toEqual([]);
		}
	});
});
