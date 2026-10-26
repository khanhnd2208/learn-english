import type { EnglishPack } from '@/lib/english/contentValidation';

export interface EnglishPackPreview {
	title: string;
	packVersion: number;
	families: Array<{
		key: string;
		kind: string;
		root: string;
		meaningVi: string;
		members: Array<{ lemma: string; affixNote: string; meaningVi: string }>;
	}>;
	words: Array<{
		lemma: string;
		senseKey: string;
		partOfSpeech: string;
		cefr: string | null;
		ipa: string;
		ipaUk: string;
		ipaUs: string;
		syllables: string[];
		stressIndex: number | null;
		definitionEn: string;
		definitionEnSimple: string;
		meaningVi: string;
		grammarNoteVi: string;
		chunks: Array<{ text: string; vi: string }>;
		commonErrors: Array<{ wrong: string; right: string; whyVi: string }>;
		hints: Array<{ order: number | null; kind: string; textEn: string; textVi: string }>;
		relations: Array<{
			kind: string;
			lemma: string;
			confusableType: string | null;
			noteVi: string;
			contrast: Array<{ lemma: string; en: string; vi: string }>;
			mistake: { wrong: string; right: string } | null;
		}>;
		examples: Array<{ english: string; target: string; targetStart: number | null; targetTag: string; cefr: string | null }>;
	}>;
}

export function previewEnglishPack(pack: EnglishPack): EnglishPackPreview {
	return {
		title: pack.title,
		packVersion: pack.packVersion,
		families: pack.families.map((family) => ({
			key: family.key,
			kind: family.kind,
			root: family.root,
			meaningVi: family.meaningVi,
			members: family.members.map((member) => ({
				lemma: member.lemma,
				affixNote: member.affixNote,
				meaningVi: member.meaningVi,
			})),
		})),
		words: pack.words.map((word) => ({
			lemma: word.lemma,
			senseKey: word.senseKey,
			partOfSpeech: word.partOfSpeech,
			cefr: word.cefr,
			ipa: word.ipa,
			ipaUk: word.ipaUk,
			ipaUs: word.ipaUs,
			syllables: word.syllables,
			stressIndex: word.stressIndex,
			definitionEn: word.definitionEn,
			definitionEnSimple: word.definitionEnSimple,
			meaningVi: word.meaningVi,
			grammarNoteVi: word.grammarNoteVi,
			chunks: word.chunks,
			commonErrors: word.commonErrors,
			hints: word.hints.map((hint) => ({
				order: hint.order,
				kind: hint.kind,
				textEn: hint.textEn,
				textVi: hint.textVi,
			})),
			relations: word.relations.map((relation) => ({
				kind: relation.kind,
				lemma: relation.lemma,
				confusableType: relation.confusableType,
				noteVi: relation.noteVi,
				contrast: relation.contrast,
				mistake: relation.mistake,
			})),
			examples: word.examples.map((example) => ({
				english: example.english,
				target: example.target,
				targetStart: example.targetStart,
				targetTag: example.targetTag,
				cefr: example.cefr,
			})),
		})),
	};
}
