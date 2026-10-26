import { lemmaKeyOf } from '@/lib/english/text';

export interface LemmaWordRow {
	id: string;
	lemma: string;
	createdAt: Date;
	ipa: string;
	audioPath: string;
	forms: string[];
	senseIds: string[];
}

export interface SenseMove {
	senseId: string;
	toWordId: string;
}

/** One kept word. Duplicate rows are listed in `deleteIds`; their senses move first. */
export interface LemmaKeepPlan {
	id: string;
	lemmaKey: string;
	forms: string[];
	ipa: string;
	audioPath: string;
	deleteIds: string[];
	senseMoves: SenseMove[];
}

export interface LemmaMergePlan {
	keeps: LemmaKeepPlan[];
	duplicateGroups: number;
	sensesMoved: number;
}

function byAge(a: LemmaWordRow, b: LemmaWordRow): number {
	const time = a.createdAt.getTime() - b.createdAt.getTime();
	if (time !== 0) return time;
	if (a.id < b.id) return -1;
	if (a.id > b.id) return 1;
	return 0;
}

function unionForms(lists: string[][]): string[] {
	const seen = new Set<string>();
	const forms: string[] = [];
	for (const list of lists) {
		for (const form of list) {
			const text = form.trim();
			const key = text.toLowerCase();
			if (!text || seen.has(key)) continue;
			seen.add(key);
			forms.push(text);
		}
	}
	return forms;
}

function firstFilled(values: string[]): string {
	return values.map((value) => value.trim()).find((value) => value.length > 0) ?? '';
}

/**
 * Fill `lemmaKey` and collapse duplicate entries onto the oldest row.
 * Learner progress hangs off sense ids, so this plan only moves `EnSense.wordId`.
 */
export function planLemmaKeyBackfill(words: LemmaWordRow[]): LemmaMergePlan {
	const groups = new Map<string, LemmaWordRow[]>();
	for (const word of words) {
		const lemmaKey = lemmaKeyOf(word.lemma);
		const group = groups.get(lemmaKey) ?? [];
		group.push(word);
		groups.set(lemmaKey, group);
	}

	const keeps: LemmaKeepPlan[] = [];
	let duplicateGroups = 0;
	let sensesMoved = 0;
	for (const [lemmaKey, group] of groups) {
		const ordered = [...group].sort(byAge);
		const keeper = ordered[0];
		if (!keeper) continue;
		const extras = ordered.slice(1);
		if (extras.length > 0) duplicateGroups += 1;
		const senseMoves = extras.flatMap((word) => word.senseIds.map((senseId) => ({
			senseId,
			toWordId: keeper.id,
		})));
		sensesMoved += senseMoves.length;
		keeps.push({
			id: keeper.id,
			lemmaKey,
			forms: unionForms(ordered.map((word) => word.forms)),
			ipa: firstFilled(ordered.map((word) => word.ipa)),
			audioPath: firstFilled(ordered.map((word) => word.audioPath)),
			deleteIds: extras.map((word) => word.id),
			senseMoves,
		});
	}
	return { keeps, duplicateGroups, sensesMoved };
}
