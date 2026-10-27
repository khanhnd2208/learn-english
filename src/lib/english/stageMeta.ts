import { EN_LEITNER_INTERVALS } from '@/lib/english/constants';
import type { LearningStage } from '@/lib/english/schedule';

const [, learning, rememberLow, rememberHigh, longTerm] = EN_LEITNER_INTERVALS;

/** Label, colours and a one-line meaning per stage; the meaning reads the real Leitner gaps. */
export const STAGE_META: Record<LearningStage, { label: string; hint: string; className: string; barClassName: string }> = {
	new: { label: 'Chưa ôn', hint: 'chưa được hỏi lần nào', className: 'bg-surface-container text-muted', barClassName: 'bg-surface-container' },
	learning: { label: 'Mới học', hint: `hẹn ôn sau ${learning} ngày`, className: 'bg-gold/20 text-foreground', barClassName: 'bg-gold' },
	remembering: { label: 'Đang nhớ', hint: `hẹn ${rememberLow}–${rememberHigh} ngày`, className: 'bg-accent-subtle text-accent', barClassName: 'bg-accent' },
	long_term: { label: 'Nhớ lâu', hint: `hẹn từ ${longTerm} ngày trở lên`, className: 'bg-success-subtle text-success', barClassName: 'bg-success' },
};
