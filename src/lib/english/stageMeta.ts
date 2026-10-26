import type { LearningStage } from '@/lib/english/schedule';

export const STAGE_META: Record<LearningStage, { label: string; className: string; barClassName: string }> = {
	new: { label: 'Chưa ôn', className: 'bg-surface-container text-muted', barClassName: 'bg-surface-container' },
	learning: { label: 'Mới học', className: 'bg-gold/20 text-foreground', barClassName: 'bg-gold' },
	remembering: { label: 'Đang nhớ', className: 'bg-accent-subtle text-accent', barClassName: 'bg-accent' },
	long_term: { label: 'Nhớ lâu', className: 'bg-success-subtle text-success', barClassName: 'bg-success' },
};
