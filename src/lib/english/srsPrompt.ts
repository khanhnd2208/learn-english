/** Hint shown for early SRS boxes. Spaces and hyphens are not counted as letters. */
export function hintFor(lemma: string): { firstLetter: string; letterCount: number } {
	const letters = lemma.trim().replace(/[\s-]/g, '');
	return { firstLetter: letters[0] ?? '', letterCount: letters.length };
}
