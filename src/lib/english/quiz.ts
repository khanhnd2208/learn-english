import { activityByKey, promptHidesAnswer, type ActivityContext, type ActivityItem } from '@/lib/english/activities';
import type { SenseBundle } from '@/lib/english/senseBundle';

export const QUIZ_KINDS = ['mcq', 'fill', 'listen'] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

export const QUIZ_META: Record<QuizKind, { label: string; icon: string; hint: string }> = {
	mcq: { label: 'Chọn nghĩa', icon: 'checklist', hint: 'Nhìn từ, chọn nghĩa đúng' },
	fill: { label: 'Điền câu', icon: 'edit', hint: 'Chọn từ hợp với câu' },
	listen: { label: 'Nghe-viết', icon: 'headphones', hint: 'Nghe rồi gõ lại' },
};

export function isQuizKind(value: string): value is QuizKind {
	return QUIZ_KINDS.some((kind) => kind === value);
}

/** One question of a quiz kind, or null when the word lacks content for it or the prompt would leak the answer. */
export function quizItemFor(kind: QuizKind, bundle: SenseBundle, ctx: ActivityContext): ActivityItem | null {
	const build = (key: Parameters<typeof activityByKey>[0], context: ActivityContext) => activityByKey(key)?.build(bundle, context) ?? null;
	const item = kind === 'mcq'
		? build('meaning_choice', ctx)
		: kind === 'fill'
			? build('cloze_choice', ctx)
			: build('listen_type', { ...ctx, allowSyntheticAudio: true });
	return item && promptHidesAnswer(item) ? item : null;
}
