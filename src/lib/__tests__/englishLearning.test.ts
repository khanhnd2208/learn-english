import { describe, expect, it } from 'vitest';
import { englishAnswerSchema } from '@/lib/english/schemas';
import { MAIN_NAV } from '@/config/navigation';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { resolveAudioFile } from '@/lib/english/audioPath';
import { draftsForAssessedPack } from '@/lib/english/questions';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { shouldSuspendQuestion } from '@/lib/english/suspend';

describe('english content gate', () => {
	const assessment = assessEnglishPack(sampleEnglishPack);

	it('keeps an ambiguous sentence out of graded questions', () => {
		expect(assessment.schemaError).toBeNull();
		const borrow = assessment.words[0];
		expect(borrow?.examples[2]?.gradeEligible).toBe(false);
		expect(borrow?.examples[2]?.issues.some((item) => item.code === 'ambiguous')).toBe(true);
		const drafts = draftsForAssessedPack(assessment);
		expect(drafts.some((draft) => draft.exampleKey === 'word:0:example:2')).toBe(false);
		expect(drafts.filter((draft) => draft.skill === 'usage' && draft.senseKey === 'word:0')).toHaveLength(6);
	});

	it('blocks a sentence that has no full Vietnamese meaning or audio', () => {
		const broken = structuredClone(sampleEnglishPack);
		broken.words[1]!.examples[0]!.meaningVi = 'cho mượn';
		broken.words[1]!.examples[1]!.audioFile = '';
		const result = assessEnglishPack(broken);
		expect(result.words[1]?.examples[0]?.gradeEligible).toBe(false);
		expect(result.words[1]?.examples[1]?.gradeEligible).toBe(false);
		const drafts = draftsForAssessedPack(result);
		expect(drafts.some((draft) => draft.exampleKey === 'word:1:example:0' || draft.exampleKey === 'word:1:example:1')).toBe(false);
	});

	it('builds pattern questions for two different examples', () => {
		const drafts = draftsForAssessedPack(assessment);
		const fills = drafts.filter((draft) => draft.kind === 'pattern_fill');
		expect(new Set(fills.map((draft) => draft.exampleKey)).size).toBe(2);
		expect(drafts.some((draft) => draft.kind === 'pattern_order')).toBe(true);
	});
});

describe('english grading and mastery', () => {
	it('grades on the server text, and audio does not promote usage', () => {
		const heard = gradeEnglishAnswer({
			skill: 'usage',
			answer: 'Borrow',
			expected: 'borrow',
			acceptedAnswers: [],
			audioOpened: true,
			skipped: false,
		});
		expect(heard.displayCorrect).toBe(true);
		expect(heard.promotes).toBe(false);
		expect(heard.penalizes).toBe(false);

		const recalled = gradeEnglishAnswer({
			skill: 'usage',
			answer: 'borrow',
			expected: 'borrow',
			acceptedAnswers: [],
			audioOpened: false,
			skipped: false,
		});
		expect(recalled.promotes).toBe(true);
	});

});

describe('english area boundaries', () => {
	it('uses root-level routes in the standalone app', () => {
		expect(MAIN_NAV.map((item) => item.href)).toEqual(['/', '/review', '/mistakes', '/progress']);
	});

	it('suspends a question after three valid reports or a high audio-open rate', () => {
		expect(shouldSuspendQuestion({ attempts: 2, audioOpens: 2, validDisputeUsers: 3 })).toBe(true);
		expect(shouldSuspendQuestion({ attempts: 8, audioOpens: 7, validDisputeUsers: 0 })).toBe(true);
		expect(shouldSuspendQuestion({ attempts: 8, audioOpens: 2, validDisputeUsers: 1 })).toBe(false);
	});

	it('rejects a client correct flag before grading', () => {
		const parsed = englishAnswerSchema.safeParse({
			questionId: 'q1',
			clientAnswerId: 'c1',
			answer: 'borrow',
			correct: true,
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects audio paths that leave the shared folder', () => {
		expect(resolveAudioFile('/var/learn-english/audio', '../release/secret.mp3')).toBeNull();
		expect(resolveAudioFile('/var/learn-english/audio', '/etc/passwd')).toBeNull();
		expect(resolveAudioFile('/var/learn-english/audio', 'borrow.mp3')).toBe('/var/learn-english/audio/borrow.mp3');
	});
});
