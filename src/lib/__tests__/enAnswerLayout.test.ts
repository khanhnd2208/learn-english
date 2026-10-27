import { describe, expect, it } from 'vitest';
import { answerLayout, answerLetters, completeAnswer, isAnswerComplete } from '@/lib/english/answerLayout';

describe('answer tiles', () => {
	it.each([
		['cat', 'cat', 'cat'],
		['ice cream', 'icecream', 'ice cream'],
		['mother-in-law', 'motherinlaw', 'mother-in-law'],
		["don't", 'dont', "don't"],
		['ÉCOLE', 'école', 'école'],
	])('builds and fills %s', (target, typed, result) => {
		const layout = answerLayout(target);
		expect(layout.letterCount).toBe([...typed].length);
		expect(layout.slots.filter((slot) => slot.kind === 'fixed').map((slot) => slot.kind === 'fixed' ? slot.value : '').join(''))
			.toBe([...target].filter((char) => !/[\p{L}\p{M}\p{N}]/u.test(char)).join(''));
		expect(completeAnswer(layout, typed)).toBe(result);
		expect(isAnswerComplete(layout, typed)).toBe(true);
	});

	it('accepts pasted separators but rejects incomplete or excessive letters', () => {
		const layout = answerLayout('ice cream');
		expect(answerLetters('ice-cream')).toBe('icecream');
		expect(answerLetters('ice cream')).toBe('icecream');
		expect(isAnswerComplete(layout, 'ice')).toBe(false);
		expect(isAnswerComplete(layout, 'icecreams')).toBe(false);
	});

	it('a cloze layout follows the sentence form', () => {
		expect(answerLayout('running').letterCount).toBe(7);
		expect(answerLayout('run').letterCount).toBe(3);
	});
});
