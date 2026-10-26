'use client';

import { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import { englishPost } from '@/components/english/englishApi';
import DailyGoalSheet from '@/components/english/goals/DailyGoalSheet';
import type { UnseenAchievement } from '@/services/english/enGoalService';

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
	unseen: UnseenAchievement[];
};

/**
 * One-time celebrations, in order: the first-run goal picker, a level-up, then new achievements.
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
	const achKey = `ach:${goals.unseen.map((entry) => entry.key).join(',')}`;
	const step = !ready ? null
		: goals.showGoalPicker && !dismissed.has('goal') ? 'goal'
			: levelUp && !dismissed.has(levelKey) ? 'level'
				: goals.unseen.length && !dismissed.has(achKey) ? 'ach'
					: null;

	function close(key: 'level' | 'ach') {
		setDismissed((current) => new Set(current).add(key === 'level' ? levelKey : achKey));
		const body = key === 'level' ? { keys: [], level: goals.level } : { keys: goals.unseen.map((entry) => entry.key) };
		void englishPost('/api/goals/seen', body).catch(() => undefined);
	}

	return <>
		<DailyGoalSheet open={step === 'goal'} intro current={goals.dailyGoalXp} todayGoal={goals.goal} onClose={() => setDismissed((current) => new Set(current).add('goal'))} />
		<Dialog open={step === 'level'} onClose={() => close('level')} title="Lên cấp!">
			<div className="space-y-3 py-2 text-center">
				<div className="animate-badge-pop mx-auto inline-flex"><span className="level-badge px-4 py-2 text-3xl">Lv {goals.level}</span></div>
				<p className="text-lg font-black">{goals.levelTitle}</p>
				<p className="text-sm text-muted">Mỗi cấp là kết quả của những lần bạn nhớ lại được từ. Tiếp tục nhé!</p>
				<button type="button" onClick={() => close('level')} className="min-h-11 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground">Tuyệt vời</button>
			</div>
		</Dialog>
		<Dialog open={step === 'ach'} onClose={() => close('ach')} title={goals.unseen.length > 1 ? `Bạn mở được ${goals.unseen.length} thành tựu` : 'Thành tựu mới'}>
			<ul className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
				{goals.unseen.map((entry) => <li key={entry.key} className="game-card-amber animate-badge-pop flex items-center gap-3 rounded-card border-2 p-3">
					<AdventureIcon name="trophy" size={26} framed />
					<div className="min-w-0"><p className="font-black">{entry.title}{entry.tierName ? ` · ${entry.tierName}` : ''}</p><p className="text-sm text-muted">{entry.description}</p></div>
				</li>)}
			</ul>
			<button type="button" onClick={() => close('ach')} className="mt-2 min-h-11 w-full rounded-control bg-accent px-5 font-bold text-accent-foreground">Nhận</button>
		</Dialog>
	</>;
}
