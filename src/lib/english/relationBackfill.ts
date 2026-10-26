import { lemmaKeyOf, locateTarget } from '@/lib/english/text';

export interface DistractorSense {
	id: string;
	distractorLemmas: string[];
	existingLemmas: string[];
}

export interface DistractorRelationPlan {
	senseId: string;
	lemma: string;
}

/** One confusable row per distractor lemma. Skip a lemma that already has one. */
export function planDistractorRelations(senses: DistractorSense[]): DistractorRelationPlan[] {
	const plans: DistractorRelationPlan[] = [];
	for (const sense of senses) {
		const seen = new Set(sense.existingLemmas.map((lemma) => lemmaKeyOf(lemma)));
		for (const lemma of sense.distractorLemmas) {
			const text = lemma.trim();
			if (!text) continue;
			const key = lemmaKeyOf(text);
			if (seen.has(key)) continue;
			seen.add(key);
			plans.push({ senseId: sense.id, lemma: text });
		}
	}
	return plans;
}

export interface SoftSense {
	id: string;
	lemmaKey: string;
	partOfSpeech: string;
}

export interface SoftRelation {
	id: string;
	lemma: string;
	targetSenseId: string | null;
	sourcePartOfSpeech: string;
}

export interface SoftMember {
	id: string;
	lemma: string;
	wordId: string | null;
}

export interface SoftWord {
	id: string;
	lemmaKey: string;
}

export interface SoftLinkPlan {
	relationUpdates: Array<{ id: string; targetSenseId: string }>;
	memberUpdates: Array<{ id: string; wordId: string }>;
}

function targetSenseId(senses: SoftSense[], lemma: string, partOfSpeech: string): string | null {
	const matches = senses.filter((sense) => sense.lemmaKey === lemmaKeyOf(lemma));
	if (matches.length === 1) return matches[0]?.id ?? null;
	const pos = partOfSpeech.trim().toLowerCase();
	const samePos = matches.filter((sense) => sense.partOfSpeech.trim().toLowerCase() === pos);
	return samePos.length === 1 ? samePos[0]?.id ?? null : null;
}

/** Fill links that were stored as text before the other word existed. Safe to run again. */
export function planSoftLinks(input: {
	relations: SoftRelation[];
	senses: SoftSense[];
	members: SoftMember[];
	words: SoftWord[];
}): SoftLinkPlan {
	const relationUpdates: SoftLinkPlan['relationUpdates'] = [];
	for (const relation of input.relations) {
		if (relation.targetSenseId) continue;
		const targetSenseIdValue = targetSenseId(input.senses, relation.lemma, relation.sourcePartOfSpeech);
		if (!targetSenseIdValue) continue;
		relationUpdates.push({ id: relation.id, targetSenseId: targetSenseIdValue });
	}
	const wordIdByKey = new Map(input.words.map((word) => [word.lemmaKey, word.id]));
	const memberUpdates: SoftLinkPlan['memberUpdates'] = [];
	for (const member of input.members) {
		if (member.wordId) continue;
		const wordId = wordIdByKey.get(lemmaKeyOf(member.lemma));
		if (!wordId) continue;
		memberUpdates.push({ id: member.id, wordId });
	}
	return { relationUpdates, memberUpdates };
}

export interface OffsetExample {
	id: string;
	english: string;
	target: string;
	targetStart: number | null;
}

export interface OffsetReportRow {
	id: string;
	english: string;
	target: string;
	reason: 'missing' | 'ambiguous';
}

export interface OffsetPlan {
	updates: Array<{ id: string; targetStart: number; targetLength: number }>;
	report: OffsetReportRow[];
}

/**
 * Fill a cloze offset only when the target occurs once.
 * Blank sentences (`___`) and ambiguous sentences are left for a person.
 */
export function planExampleOffsets(examples: OffsetExample[]): OffsetPlan {
	const updates: OffsetPlan['updates'] = [];
	const report: OffsetReportRow[] = [];
	for (const example of examples) {
		if (example.targetStart != null) continue;
		if (example.english.includes('___')) continue;
		const located = locateTarget(example.english, example.target);
		if (typeof located === 'string') {
			report.push({
				id: example.id,
				english: example.english,
				target: example.target,
				reason: located,
			});
			continue;
		}
		updates.push({ id: example.id, targetStart: located.start, targetLength: located.length });
	}
	return { updates, report };
}
