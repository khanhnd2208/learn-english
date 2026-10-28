import type { ActivityContext, ActivityDefinition, ActivityItem, ActivityKey } from '@/lib/english/activities/types';
import { chooseDistractors } from '@/lib/english/activities/distractors';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { exampleParts, quizExamplesOf, type SenseBundle } from '@/lib/english/senseBundle';
import { lemmaKeyOf, normalizeLearnerText, uniqueTexts } from '@/lib/english/text';

function hasAudio(sense: SenseBundle): boolean {
	return Boolean(sense.word.audioPath.trim());
}

function gradeTyped(item: ActivityItem, answer: string): boolean {
	if (!answer.trim()) return false;
	return gradeEnglishAnswer({
		skill: 'sound',
		answer,
		expected: item.answerKey,
		acceptedAnswers: item.accepted,
		audioOpened: false,
		skipped: false,
	}).displayCorrect;
}

function gradeChoice(item: ActivityItem, answer: string): boolean {
	return normalizeLearnerText(answer) === normalizeLearnerText(item.answerKey);
}

function meaningOptions(sense: SenseBundle, ctx: ActivityContext): string[] | null {
	const answer = sense.sense.meaningVi.trim();
	if (!answer) return null;
	const picked = chooseDistractors(sense, ctx.pool, 8, ctx.preferOutsideTest === true);
	const meanings = uniqueTexts(picked.map((entry) => entry.meaningVi))
		.filter((meaning) => normalizeLearnerText(meaning) !== normalizeLearnerText(answer));
	if (meanings.length < 3) return null;
	return ctx.rng.shuffle([answer, ...meanings.slice(0, 3)]);
}

function lemmaOptions(sense: SenseBundle, ctx: ActivityContext): string[] | null {
	const answer = sense.word.lemma.trim();
	if (!answer) return null;
	const picked = chooseDistractors(sense, ctx.pool, 8, ctx.preferOutsideTest === true);
	const lemmas = uniqueTexts(picked.map((entry) => entry.lemma))
		.filter((lemma) => lemmaKeyOf(lemma) !== lemmaKeyOf(answer));
	if (lemmas.length < 3) return null;
	return ctx.rng.shuffle([answer, ...lemmas.slice(0, 3)]);
}

function clozeExamples(sense: SenseBundle) {
	return quizExamplesOf(sense.examples).flatMap((example) => {
		const cloze = exampleParts(example);
		return cloze ? [{ example, cloze }] : [];
	});
}

function base(sense: SenseBundle, key: ActivityKey, role: ActivityDefinition['role'], prompt: Record<string, unknown>, answerKey: string, accepted: string[] = []): ActivityItem {
	return { activityKey: key, role, senseId: sense.sense.id, prompt, answerKey, accepted };
}

function meaningChoice(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	if (!sense.word.lemma.trim()) return null;
	const choices = meaningOptions(sense, ctx);
	if (!choices) return null;
	return base(sense, 'meaning_choice', 'recognize', {
		kind: 'meaning_choice',
		senseId: sense.sense.id,
		lemma: sense.word.lemma,
		ipa: sense.word.ipa,
		choices,
	}, sense.sense.meaningVi);
}

function clozeChoice(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	const options = clozeExamples(sense);
	const picked = ctx.rng.pick(options);
	if (!picked) return null;
	const choices = lemmaOptions(sense, ctx);
	if (!choices) return null;
	const surface = picked.cloze.answer;
	const withSurface = choices.some((choice) => normalizeLearnerText(choice) === normalizeLearnerText(surface))
		? choices
		: ctx.rng.shuffle([surface, ...choices.filter((choice) => lemmaKeyOf(choice) !== lemmaKeyOf(sense.word.lemma)).slice(0, 3)]);
	if (withSurface.length < 4) return null;
	return base(sense, 'cloze_choice', 'recognize', {
		kind: 'cloze_choice',
		before: picked.cloze.before,
		after: picked.cloze.after,
		meaningVi: picked.example.meaningVi,
		choices: withSurface,
	}, surface);
}

function listenType(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	if ((!hasAudio(sense) && !ctx.allowSyntheticAudio) || !sense.word.lemma.trim()) return null;
	return base(sense, 'listen_type', 'recall', {
		kind: 'listen_type',
		senseId: sense.sense.id,
		meaningVi: sense.sense.meaningVi,
	}, sense.word.lemma, sense.word.forms.filter((form) => normalizeLearnerText(form) !== normalizeLearnerText(sense.word.lemma)));
}

export const ACTIVITIES: ActivityDefinition[] = [
 { key: 'meaning_choice', label: 'Nhìn từ → chọn nghĩa', role: 'recognize', build: meaningChoice, grade: gradeChoice },
 { key: 'listen_type', label: 'Nghe → viết từ', role: 'recall', build: listenType, grade: gradeTyped },
 { key: 'cloze_choice', label: 'Điền vào câu', role: 'recognize', build: clozeChoice, grade: gradeChoice },
];
const byKey = new Map(ACTIVITIES.map((activity) => [activity.key, activity]));
export function activityByKey(key: string): ActivityDefinition | null { return byKey.get(key as ActivityKey) ?? null; }
