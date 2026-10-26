import { describe, expect, it } from 'vitest';
import { MAIN_NAV } from '@/config/navigation';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { resolveAudioFile } from '@/lib/english/audioPath';
import { sampleEnglishPack } from '@/lib/english/samplePack';

describe('english content gate', () => {
	const assessment = assessEnglishPack(sampleEnglishPack);

	it('keeps an ambiguous sentence out of graded examples', () => {
		expect(assessment.schemaError).toBeNull();
		const borrow = assessment.words[0];
		expect(borrow?.examples[2]?.gradeEligible).toBe(false);
		expect(borrow?.examples[2]?.issues.some((item) => item.code === 'ambiguous')).toBe(true);
		expect(assessment.words.every((word) => word.publishable)).toBe(true);
	});

	it('blocks a sentence that has no full Vietnamese meaning or audio', () => {
		const broken = structuredClone(sampleEnglishPack);
		broken.words[1]!.examples[0]!.meaningVi = 'cho mượn';
		broken.words[1]!.examples[1]!.audioFile = '';
		const result = assessEnglishPack(broken);
		expect(result.words[1]?.examples[0]?.gradeEligible).toBe(false);
		expect(result.words[1]?.examples[1]?.gradeEligible).toBe(false);
	});

	it('warns about optional fields without blocking publication', () => {
		const loose = structuredClone(sampleEnglishPack);
		loose.words[0]!.hints = [];
		loose.words[0]!.definitionEn = '';
		loose.words[0]!.distractorMeanings = [];
		const result = assessEnglishPack(loose);
		expect(result.words[0]?.issues.some((item) => item.code === 'hint_too_few')).toBe(true);
		expect(result.words[0]?.issues.filter((item) => item.code === 'definition_missing').every((item) => !item.blocksGrade)).toBe(true);
		expect(result.words[0]?.publishable).toBe(true);
	});

	it('still blocks a word without a Vietnamese meaning', () => {
		const broken = structuredClone(sampleEnglishPack);
		broken.words[0]!.meaningVi = '';
		expect(assessEnglishPack(broken).words[0]?.publishable).toBe(false);
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
		expect(MAIN_NAV.map((item) => item.href)).toEqual(['/', '/sets', '/review']);
	});

	it('rejects audio paths that leave the shared folder', () => {
		expect(resolveAudioFile('/var/learn-english/audio', '../release/secret.mp3')).toBeNull();
		expect(resolveAudioFile('/var/learn-english/audio', '/etc/passwd')).toBeNull();
		expect(resolveAudioFile('/var/learn-english/audio', 'borrow.mp3')).toBe('/var/learn-english/audio/borrow.mp3');
	});
});
