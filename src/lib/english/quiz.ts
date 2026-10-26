import { activityByKey, promptHidesAnswer, type ActivityContext, type ActivityItem } from '@/lib/english/activities';
import type { SenseBundle } from '@/lib/english/senseBundle';
import type { Rng } from '@/lib/english/activities/rng';
import { EN_QUIZ_MAX_ITEMS } from '@/lib/english/constants';

export const QUIZ_KINDS = ['mcq', 'fill', 'listen'] as const;
export type QuizKind = typeof QUIZ_KINDS[number];
export const QUIZ_META: Record<QuizKind, { label: string; icon: string }> = {
 mcq: { label: 'MCQ', icon: 'checklist' },
 fill: { label: 'Điền từ', icon: 'edit' },
 listen: { label: 'Nghe-viết', icon: 'headphones' },
};
export function isQuizKind(value: string): value is QuizKind { return QUIZ_KINDS.some((kind) => kind === value); }
export function quizItemFor(kind: QuizKind, bundle: SenseBundle, ctx: ActivityContext): ActivityItem | null {
 const item = kind === 'mcq'
  ? activityByKey('meaning_choice')!.build(bundle, ctx) ?? activityByKey('cloze_choice')!.build(bundle, ctx)
  : kind === 'fill'
   ? activityByKey('recall_type')!.build(bundle, { ...ctx, recallPrompt: 'meaning' })
   : activityByKey('listen_type')!.build(bundle, { ...ctx, allowSyntheticAudio: true });
 return item && promptHidesAnswer(item) ? item : null;
}
export function pickQuizSenses<T extends { senseId: string; lapses: number; box: number }>(words: T[], limit = EN_QUIZ_MAX_ITEMS, rng: Rng): T[] {
 const unique = [...new Map(words.map((word) => [word.senseId, word])).values()];
 const weak = rng.shuffle(unique.filter((word) => word.lapses > 0 || (word.box > 0 && word.box <= 2)))
  .sort((a, b) => b.lapses - a.lapses || a.box - b.box);
 const picked = weak.slice(0, Math.min(limit, EN_QUIZ_MAX_ITEMS));
 const used = new Set(picked.map((word) => word.senseId));
 return [...picked, ...rng.shuffle(unique.filter((word) => !used.has(word.senseId))).slice(0, Math.max(0, Math.min(limit, EN_QUIZ_MAX_ITEMS) - picked.length))];
}
