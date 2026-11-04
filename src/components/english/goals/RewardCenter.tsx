'use client';

import { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { englishPost } from '@/components/english/englishApi';
import DailyGoalSheet from '@/components/english/goals/DailyGoalSheet';

export type ShellGoals = {
	xp: number;
	goal: number;
	level: number;
	levelTitle: string;
	seenLevel: number;
	questsDone: number;
	questsTotal: number;
	dailyGoalXp: number;
	showGoalPicker: boolean;
};

/**
 * One-time celebrations: the first-run goal picker, then a level-up.
 * Each is marked as seen on the server when closed, so it never shows twice.
 */
export default function RewardCenter({ goals }: { goals: ShellGoals }) {
	const levelUp = goals.level > Math.max(1, goals.seenLevel);
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const [ready, setReady] = useState(false);

	// Wait a moment so a page that just loaded is visible before a dialog covers it.
	useEffect(() => {
		const timer = window.setTimeout(() => setReady(true), 600);
		return () => window.clearTimeout(timer);
	}, []);

	// Keys carry the content, so a new level or badge after a refresh shows even if an earlier one was closed.
	const levelKey = `level:${goals.level}`;
	const step = !ready ? null
		: goals.showGoalPicker && !dismissed.has('goal') ? 'goal'
			: levelUp && !dismissed.has(levelKey) ? 'level' : null;

	function close() {
		setDismissed((current) => new Set(current).add(levelKey));
		void englishPost('/api/goals/seen', { level: goals.level }).catch(() => undefined);
	}

	return <>
		<DailyGoalSheet open={step === 'goal'} intro current={goals.dailyGoalXp} todayGoal={goals.goal} onClose={() => setDismissed((current) => new Set(current).add('goal'))} />
		<Dialog open={step === 'level'} onClose={close} title="Lên cấp!">
			<div className="space-y-3 py-2 text-center">
				<div className="animate-badge-pop mx-auto inline-flex"><span className="level-badge px-4 py-2 text-3xl">Cấp {goals.level}</span></div>
				<p className="text-lg font-black">{goals.levelTitle}</p>
				<p className="text-sm text-muted">Mỗi cấp là kết quả của những lần bạn nhớ lại được từ. Tiếp tục nhé!</p>
				<button type="button" onClick={close} className="min-h-11 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground">Tuyệt vời</button>
			</div>
		</Dialog>
	</>;
}
