'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Sheet from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { englishPost } from '@/components/english/englishApi';
import { tierQuestTargets } from '@/lib/english/quests';
import { DAILY_GOAL_TIERS } from '@/lib/english/xp';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';

function tierHint(index: number): string {
	const { srs, chunks } = tierQuestTargets(index);
	return `≈ ${srs} từ đến hạn + ${chunks} chặng Ôn theo bộ`;
}

/** Pick one of four daily XP goals. A change shows up on tomorrow's quest board. */
export default function DailyGoalSheet({ open, onClose, current, todayGoal, intro = false }: {
	open: boolean;
	onClose: () => void;
	current: number;
	/** Goal on today's board, to say when a change waits until tomorrow. */
	todayGoal: number;
	intro?: boolean;
}) {
	const router = useRouter();
	const { toast } = useToast();
	const [selected, setSelected] = useState(current);
	const [saving, setSaving] = useState(false);

	async function save(xp: number) {
		setSaving(true);
		try {
			await englishPost('/api/goals/daily-goal', { xp });
			if (!intro) toast(xp === todayGoal ? 'Đã lưu mục tiêu ngày.' : 'Đã lưu. Mục tiêu mới áp dụng từ ngày mai.', 'success');
			onClose();
			router.refresh();
		} catch (cause) {
			toast(cause instanceof Error ? cause.message : 'Không lưu được mục tiêu.', 'error');
		} finally {
			setSaving(false);
		}
	}

	// Closing the first-run picker keeps the default, so it does not come back on every page.
	const dismiss = () => { if (intro) void save(current); else onClose(); };

	return <Sheet open={open} onClose={dismiss} title={intro ? 'Chọn mục tiêu mỗi ngày' : 'Mục tiêu ngày'}>
		<p className="flex items-center gap-1.5 text-sm text-muted">{intro ? 'Học đều mỗi ngày quan trọng hơn học nhiều. Đổi được bất cứ lúc nào.' : 'Mục tiêu tính bằng XP.'}<InfoHint title={HINTS.xp.title}>{HINTS.xp.body}</InfoHint></p>
		<div role="radiogroup" aria-label="Mức mục tiêu" className="mt-4 space-y-2">
			{DAILY_GOAL_TIERS.map((tier, index) => {
				const active = selected === tier.xp;
				return <button key={tier.xp} type="button" role="radio" aria-checked={active} onClick={() => setSelected(tier.xp)} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-card border-2 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? 'border-accent bg-accent-subtle' : 'border-border bg-surface hover:border-accent/60'}`}>
					<span><span className="block font-bold">{tier.label}</span><span className="text-xs text-muted">{tierHint(index)}</span></span>
					<span className="game-number text-2xl tabular-nums">{tier.xp} XP</span>
				</button>;
			})}
		</div>
		<button type="button" disabled={saving} onClick={() => void save(selected)} className="mt-5 min-h-12 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground disabled:opacity-60">{saving ? 'Đang lưu…' : intro ? 'Bắt đầu' : 'Lưu mục tiêu'}</button>
		{!intro && selected !== todayGoal && <p className="mt-2 text-center text-xs text-muted">Mục tiêu XP đổi ngay; nhiệm vụ hôm nay giữ mức cũ, mức mới áp dụng từ ngày mai.</p>}
	</Sheet>;
}
