'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { GoalReward } from '@/services/english/enGoalService';

/** XP gained in a session, the floating "+N XP" pop, and toasts for finished quests and badges. */
export function useRewardToasts() {
	const { toast } = useToast();
	const [sessionXp, setSessionXp] = useState(0);
	const [xpPop, setXpPop] = useState<{ id: number; xp: number } | null>(null);
	const reward = useCallback((earned: GoalReward | null | undefined) => {
		if (!earned) return;
		if (earned.xp > 0) {
			setSessionXp((current) => current + earned.xp);
			setXpPop({ id: Date.now(), xp: earned.xp });
		}
		for (const quest of earned.quests) toast(`✓ ${quest.title} · +${quest.xp} XP`, 'success');
		for (const badge of earned.achievements) toast(`🏆 Thành tựu: ${badge.title}${badge.tierName ? ` · ${badge.tierName}` : ''}`, 'success');
	}, [toast]);
	return { sessionXp, xpPop, reward };
}
