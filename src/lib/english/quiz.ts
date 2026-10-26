import { activityByKey, promptHidesAnswer, type ActivityContext, type ActivityItem } from '@/lib/english/activities';
import type { SenseBundle } from '@/lib/english/senseBundle';
import type { Rng } from '@/lib/english/activities/rng';
import { EN_QUIZ_MAX_ITEMS } from '@/lib/english/constants';

export const QUIZ_KINDS = ['mcq', 'fill', 'listen'] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

export const QUIZ_META: Record<QuizKind, { label: string; icon: string; hint: string }> = {
	mcq: { label: 'MCQ', icon: 'checklist', hint: 'Chọn nghĩa đúng' },
	fill: { label: 'Điền từ', icon: 'edit', hint: 'Nhìn nghĩa, gõ từ' },
	listen: { label: 'Nghe-viết', icon: 'headphones', hint: 'Nghe rồi gõ lại' },
};

export function isQuizKind(value: string): value is QuizKind {
	return QUIZ_KINDS.some((kind) => kind === value);
}

/** One question of a quiz kind, or null when the word lacks content for it or the prompt would leak the answer. */
export function quizItemFor(kind: QuizKind, bundle: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	const build = (key: Parameters<typeof activityByKey>[0], context: ActivityContext) => activityByKey(key)?.build(bundle, context) ?? null;
	const item = kind === 'mcq'
		? build('meaning_choice', ctx) ?? build('cloze_choice', ctx)
		: kind === 'fill'
			? build('recall_type', { ...ctx, recallPrompt: 'meaning' })
			: build('listen_type', { ...ctx, allowSyntheticAudio: true });
	return item && promptHidesAnswer(item) ? item : null;
}

/** Weak words first (lapsed or still in boxes 1–2), then a random fill-up, at most EN_QUIZ_MAX_ITEMS. */
export function pickQuizSenses<T extends { senseId: string; lapses: number; box: number }>(words: T[], limit = EN_QUIZ_MAX_ITEMS, rng: Rng): T[] {
	const max = Math.min(limit, EN_QUIZ_MAX_ITEMS);
	const unique = [...new Map(words.map((word) => [word.senseId, word])).values()];
	const weak = rng.shuffle(unique.filter((word) => word.lapses > 0 || (word.box > 0 && word.box <= 2)))
		.sort((a, b) => b.lapses - a.lapses || a.box - b.box)
		.slice(0, max);
	const used = new Set(weak.map((word) => word.senseId));
	const rest = rng.shuffle(unique.filter((word) => !used.has(word.senseId))).slice(0, max - weak.length);
	return [...weak, ...rest];
}
