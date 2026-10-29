export function normalizeLearnerText(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[.,!?;:'"“”‘’]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function normalizeSequence(value: string): string {
	return value
		.split('|')
		.map((part) => normalizeLearnerText(part))
		.filter(Boolean)
		.join('|');
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Vietnam has stayed on a fixed +07:00 with no daylight saving since 1975, matching `vnDayStart`.
 * Plain arithmetic: building an `Intl.DateTimeFormat` per call dominated CPU and native memory
 * when reward settling keys thousands of review rows per answer.
 */
export function studyDayKey(date: Date): string {
	return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function isFullVietnameseMeaning(meaningVi: string, gloss: string): boolean {
	const text = meaningVi.trim();
	if (text.length < 12 || !text.includes(' ')) return false;
	return text.toLowerCase() !== gloss.trim().toLowerCase();
}

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wholeWordPattern(needle: string, flags: string): RegExp {
	return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`, flags);
}

export function containsWholeWord(text: string, needle: string): boolean {
	const term = needle.trim();
	if (!term) return false;
	return wholeWordPattern(term, 'iu').test(text);
}

export type TargetLocation = { start: number; length: number } | 'missing' | 'ambiguous';

/** Find the one whole-word occurrence of `target`. Case-insensitive. `lend` does not match `lender`. */
export function locateTarget(english: string, target: string): TargetLocation {
	const needle = target.trim();
	if (!needle) return 'missing';
	const matches = [...english.matchAll(wholeWordPattern(needle, 'giu'))];
	if (matches.length === 0) return 'missing';
	if (matches.length > 1) return 'ambiguous';
	return { start: matches[0].index ?? 0, length: needle.length };
}

export function blankReport(english: string, target: string): { ok: boolean; code?: 'one_blank' | 'target_once' } {
	const blanks = english.split('___').length - 1;
	if (blanks !== 1) return { ok: false, code: 'one_blank' };
	const filled = english.replace('___', target);
	const flags = 'gi';
	const re = new RegExp(`\\b${escapeRegExp(target)}\\b`, flags);
	const matches = filled.match(re);
	if (!matches || matches.length !== 1) return { ok: false, code: 'target_once' };
	return { ok: true };
}

export function splitBlank(english: string): { before: string; after: string } | null {
	const parts = english.split('___');
	if (parts.length !== 2) return null;
	return { before: parts[0] ?? '', after: parts[1] ?? '' };
}

/** Identity key for one English entry. Keeps hyphens and single spaces (phrasal verbs). */
export function lemmaKeyOf(lemma: string): string {
	return lemma.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function uniqueTexts(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		const text = value.trim();
		const key = text.toLowerCase();
		if (!text || seen.has(key)) continue;
		seen.add(key);
		result.push(text);
	}
	return result;
}
