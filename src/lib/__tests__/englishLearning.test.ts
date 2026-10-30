import { describe, expect, it } from 'vitest';
import { MAIN_NAV, isNavActive } from '@/config/navigation';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { resolveAudioFile } from '@/lib/english/audioPath';
import { sampleEnglishPack } from '@/lib/english/samplePack';

describe('english content gate', () => {
 it('blocks a word without a Vietnamese meaning', () => { const broken = structuredClone(sampleEnglishPack); broken.words[0]!.meaningVi = ''; expect(assessEnglishPack(broken).words[0]?.publishable).toBe(false); });
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
		expect(MAIN_NAV.map((item) => item.href)).toEqual(['/', '/review', '/progress', '/store']);
		expect(isNavActive('/sets/example/practice', '/sets')).toBe(true);
		expect(isNavActive('/sets/example/practice', '/')).toBe(false);
		expect(isNavActive('/quests', '/progress')).toBe(true);
		expect(isNavActive('/store', '/')).toBe(false);
	});

	it('rejects audio paths that leave the shared folder', () => {
		expect(resolveAudioFile('/var/learn-english/audio', '../release/secret.mp3')).toBeNull();
		expect(resolveAudioFile('/var/learn-english/audio', '/etc/passwd')).toBeNull();
		expect(resolveAudioFile('/var/learn-english/audio', 'borrow.mp3')).toBe('/var/learn-english/audio/borrow.mp3');
	});
});
