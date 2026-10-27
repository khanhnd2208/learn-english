export type AnswerSlot = { kind: 'letter' } | { kind: 'fixed'; value: string };
export type AnswerLayout = { slots: AnswerSlot[]; letterCount: number };

const editable = /[\p{L}\p{M}\p{N}]/u;

/** Only the shape of an answer may be sent before a graded quiz is finished. */
export function answerLayout(answer: string): AnswerLayout {
	const slots: AnswerSlot[] = [...answer.trim()].map((value) => editable.test(value) ? { kind: 'letter' } : { kind: 'fixed', value });
	return { slots, letterCount: slots.filter((slot) => slot.kind === 'letter').length };
}

export function answerLetters(value: string): string {
	return [...value].filter((char) => editable.test(char)).join('');
}

export function completeAnswer(layout: AnswerLayout, letters: string): string {
	let index = 0;
	return layout.slots.map((slot) => slot.kind === 'fixed' ? slot.value : [...letters][index++] ?? '').join('');
}

export function isAnswerComplete(layout: AnswerLayout, letters: string): boolean {
	return [...letters].length === layout.letterCount;
}
