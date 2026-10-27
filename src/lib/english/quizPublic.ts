import { answerLayout } from '@/lib/english/answerLayout';

export type StoredQuizItem = { position: number; activityKey: string; prompt: unknown; answer: string | null; answerKey: string };

/** Resume old attempts with the same answer shape, without exposing their answer key. */
export function publicQuizItems(items: StoredQuizItem[]) {
	return [...items].sort((a, b) => a.position - b.position).map((item) => ({
		position: item.position,
		activityKey: item.activityKey,
		prompt: item.prompt as Record<string, unknown>,
		answer: item.answer,
		layout: ['spell_hinted', 'recall_type', 'listen_type'].includes(item.activityKey) ? answerLayout(item.answerKey) : null,
	}));
}
