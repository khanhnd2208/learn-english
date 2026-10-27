import { describe, expect, it } from 'vitest';
import { questionAudio, type PublicQuestion } from '@/components/english/quiz/QuestionView';

const listenQuestion: PublicQuestion = {
	position: 0,
	activityKey: 'listen_type',
	prompt: { senseId: 'sense-1' },
};

describe('question audio', () => {
	it('uses the bundle lemma for hidden-answer listening prompts', () => {
		expect(questionAudio(listenQuestion, 'borrow', false)).toEqual({
			senseId: 'sense-1',
			lemma: 'borrow',
			recordedAudioAvailable: false,
		});
	});

	it('does not assume a recorded file exists when audio metadata is absent', () => {
		expect(questionAudio(listenQuestion).recordedAudioAvailable).toBe(false);
	});

	it('uses visible prompt text as the speech fallback for meaning questions', () => {
		const meaningQuestion: PublicQuestion = {
			position: 1,
			activityKey: 'meaning_choice',
			prompt: { senseId: 'sense-2', lemma: 'lend' },
		};
		expect(questionAudio(meaningQuestion).lemma).toBe('lend');
	});
});
