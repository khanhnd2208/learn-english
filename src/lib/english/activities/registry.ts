import type { ActivityContext, ActivityDefinition, ActivityItem, ActivityKey } from '@/lib/english/activities/types';
import { chooseDistractors } from '@/lib/english/activities/distractors';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { clozeOf, type SenseBundle } from '@/lib/english/senseBundle';
import { lemmaKeyOf, normalizeLearnerText, uniqueTexts } from '@/lib/english/text';

function hasAudio(sense: SenseBundle): boolean {
	return Boolean(sense.word.audioPath.trim() || sense.word.audioUkPath.trim() || sense.word.audioUsPath.trim());
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

function gradePairs(item: ActivityItem, answer: string): boolean {
	const given = answer.split('|').map((part) => {
		const [lemma, meaning] = part.split('=');
		return `${normalizeLearnerText(lemma ?? '')}=${normalizeLearnerText(meaning ?? '')}`;
	}).filter((part) => part !== '=').sort().join('|');
	return given === item.answerKey;
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
	return sense.examples.flatMap((example) => {
		const cloze = clozeOf(example);
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
		ipa: sense.sense.ipaOverride || sense.word.ipa,
		choices,
	}, sense.sense.meaningVi);
}

function listenChoice(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	if (!hasAudio(sense) && !ctx.allowSyntheticAudio) return null;
	const choices = meaningOptions(sense, ctx);
	if (!choices) return null;
	return base(sense, 'listen_choice', 'recognize', {
		kind: 'listen_choice',
		senseId: sense.sense.id,
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

function matchPairs(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	const others = chooseDistractors(sense, ctx.pool, 4, false);
	if (others.length < 4) return null;
	const pairs = [
		{ lemma: sense.word.lemma, meaning: sense.sense.meaningVi },
		...others.map((entry) => ({ lemma: entry.lemma, meaning: entry.meaningVi })),
	];
	return base(sense, 'match_pairs', 'recognize', {
		kind: 'match_pairs',
		lemmas: ctx.rng.shuffle(pairs.map((pair) => pair.lemma)),
		meanings: ctx.rng.shuffle(pairs.map((pair) => pair.meaning)),
	}, pairKey(pairs));
}

function pairKey(pairs: Array<{ lemma: string; meaning: string }>): string {
	return pairs
		.map((pair) => `${normalizeLearnerText(pair.lemma)}=${normalizeLearnerText(pair.meaning)}`)
		.sort()
		.join('|');
}

function spellHinted(sense: SenseBundle): ActivityItem | null {
	const lemma = sense.word.lemma.trim();
	const letters = lemma.replace(/[\s-]/g, '');
	if (!lemma || !sense.sense.meaningVi.trim() || !letters) return null;
	return base(sense, 'spell_hinted', 'recall', {
		kind: 'spell_hinted',
		meaningVi: sense.sense.meaningVi,
		firstLetter: letters[0] ?? '',
		letterCount: letters.length,
	}, lemma, sense.word.forms.filter((form) => normalizeLearnerText(form) !== normalizeLearnerText(lemma)));
}

function recallType(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	const cloze = ctx.rng.pick(clozeExamples(sense));
	const meaning = sense.sense.meaningVi.trim();
	const useCloze = ctx.recallPrompt !== 'meaning' && Boolean(cloze) && (!meaning || ctx.rng.next() < 0.5);
	if (useCloze && cloze) {
		return base(sense, 'recall_type', 'recall', {
			kind: 'recall_type',
			mode: 'cloze',
			before: cloze.cloze.before,
			after: cloze.cloze.after,
			meaningVi: cloze.example.meaningVi,
		}, cloze.cloze.answer);
	}
	if (!meaning || !sense.word.lemma.trim()) return null;
	return base(sense, 'recall_type', 'recall', {
		kind: 'recall_type',
		mode: 'meaning',
		meaningVi: meaning,
		partOfSpeech: sense.sense.partOfSpeech,
	}, sense.word.lemma, sense.word.forms.filter((form) => normalizeLearnerText(form) !== normalizeLearnerText(sense.word.lemma)));
}

function listenType(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	if ((!hasAudio(sense) && !ctx.allowSyntheticAudio) || !sense.word.lemma.trim()) return null;
	return base(sense, 'listen_type', 'recall', {
		kind: 'listen_type',
		senseId: sense.sense.id,
	}, sense.word.lemma, sense.word.forms.filter((form) => normalizeLearnerText(form) !== normalizeLearnerText(sense.word.lemma)));
}

function speakShadow(sense: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	if ((!hasAudio(sense) && !ctx.allowSyntheticAudio) || !sense.word.lemma.trim()) return null;
	return base(sense, 'speak_shadow', 'none', {
		kind: 'speak_shadow',
		senseId: sense.sense.id,
		lemma: sense.word.lemma,
		ipa: sense.sense.ipaOverride || sense.word.ipa,
	}, '');
}

export const ACTIVITIES: ActivityDefinition[] = [
	{ key: 'meaning_choice', label: 'Nhìn từ → chọn nghĩa', role: 'recognize', inPractice: true, inTest: true, sortOrder: 10, build: meaningChoice, grade: gradeChoice },
	{ key: 'listen_choice', label: 'Nghe → chọn nghĩa', role: 'recognize', inPractice: true, inTest: true, sortOrder: 20, build: listenChoice, grade: gradeChoice },
	{ key: 'cloze_choice', label: 'Điền vào câu (chọn)', role: 'recognize', inPractice: true, inTest: true, sortOrder: 30, build: clozeChoice, grade: gradeChoice },
	{ key: 'match_pairs', label: 'Ghép cặp', role: 'recognize', inPractice: true, inTest: false, sortOrder: 40, build: matchPairs, grade: gradePairs },
	{ key: 'spell_hinted', label: 'Nhìn nghĩa → viết từ (có chữ đầu + số chữ)', role: 'recall', inPractice: true, inTest: false, sortOrder: 50, build: (sense) => spellHinted(sense), grade: gradeTyped },
	{ key: 'recall_type', label: 'Nhìn nghĩa hoặc câu đục lỗ → viết từ', role: 'recall', inPractice: true, inTest: true, sortOrder: 60, build: recallType, grade: gradeTyped },
	{ key: 'listen_type', label: 'Nghe → viết từ', role: 'recall', inPractice: true, inTest: true, sortOrder: 70, build: listenType, grade: gradeTyped },
	{ key: 'speak_shadow', label: 'Nghe mẫu, ghi âm, tự so', role: 'none', inPractice: true, inTest: false, sortOrder: 80, build: speakShadow },
];

const byKey = new Map(ACTIVITIES.map((activity) => [activity.key, activity]));

export function activityByKey(key: string): ActivityDefinition | null {
	return byKey.get(key as ActivityKey) ?? null;
}

export function isActivityKey(key: string): key is ActivityKey {
	return byKey.has(key as ActivityKey);
}
