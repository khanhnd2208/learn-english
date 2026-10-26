'use client';

import { useState } from 'react';
import Sheet from '@/components/ui/Sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import DailyGoalSheet from '@/components/english/goals/DailyGoalSheet';
import GoalRing from '@/components/english/goals/GoalRing';
import LevelBar from '@/components/english/goals/LevelBar';
import QuestItem from '@/components/english/goals/QuestItem';
import WeekStrip from '@/components/english/goals/WeekStrip';
import { ACHIEVEMENT_GROUPS, TIER_NAMES, type AchievementGroup, type AchievementIcon } from '@/lib/english/achievements';
import { DAILY_GOAL_TIERS, XP } from '@/lib/english/xp';
import type { GoalAchievement, GoalBoard } from '@/services/english/enGoalService';

type Tab = 'today' | 'week' | 'achievements';

function goalLabel(xp: number): string {
	return DAILY_GOAL_TIERS.find((tier) => tier.xp === xp)?.label ?? `${xp} XP`;
}

/** Encouraging copy for the daily ring; never blames a learner for a slow day. */
function goalMessage(xp: number, goal: number): string {
	if (xp >= goal) return 'Đã đạt mục tiêu hôm nay. Phần còn lại là thưởng thêm!';
	if (xp === 0) return 'Một lượt ôn ngắn là đủ để bắt đầu.';
	const left = goal - xp;
	return left <= 10 ? `Còn ${left} XP, chỉ vài câu nữa thôi.` : `Còn ${left} XP, khoảng ${Math.max(1, Math.ceil(left / (XP.reviewCorrect * 6)))} phút ôn.`;
}

export default function QuestsView({ board, quizHref, dayResetsIn, weekResetsIn, initialTab }: {
	board: GoalBoard;
	quizHref: string;
	dayResetsIn: string;
	weekResetsIn: string;
	initialTab: Tab;
}) {
	const [tab, setTab] = useState<Tab>(initialTab);
	const [goalOpen, setGoalOpen] = useState(false);
	const [detail, setDetail] = useState<GoalAchievement | null>(null);
	const unlockedCount = board.achievements.reduce((sum, entry) => sum + entry.reached, 0);
	const tierCount = board.achievements.reduce((sum, entry) => sum + entry.tiers.length, 0);
	const weekDone = board.week.quests.filter((quest) => quest.done).length;

	return <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
		<header className="game-hero relative overflow-hidden rounded-panel border-2 p-5 sm:p-6">
			<div className="flex flex-wrap items-center gap-4">
				<span className="animate-badge-pop level-badge px-3 py-2 text-2xl">Lv {board.level.level}</span>
				<div className="min-w-0 flex-1"><h1 className="text-4xl">{board.level.title}</h1><p className="text-sm text-muted">Tổng {board.level.total} XP</p></div>
			</div>
			<div className="mt-4"><LevelBar level={board.level} label={false} /></div>
			<dl className="mt-4 grid grid-cols-3 gap-2 text-center">
				<div className="game-stat-box p-2"><dt className="text-[10px] font-bold uppercase text-muted">Chuỗi ngày</dt><dd className="game-number text-2xl tabular-nums">🔥 {board.streak.current}</dd></div>
				<div className="game-stat-box p-2"><dt className="text-[10px] font-bold uppercase text-muted">Nhớ lâu</dt><dd className="game-number text-2xl tabular-nums">{board.longTermCount}</dd></div>
				<div className="game-stat-box p-2"><dt className="text-[10px] font-bold uppercase text-muted">Thành tựu</dt><dd className="game-number text-2xl tabular-nums">{unlockedCount}/{tierCount}</dd></div>
			</dl>
		</header>

		<Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
			<TabsList>
				<TabsTrigger value="today">Hôm nay</TabsTrigger>
				<TabsTrigger value="week">Tuần này</TabsTrigger>
				<TabsTrigger value="achievements">Thành tựu{board.unseenAchievements.length > 0 && <span className="ml-1.5 inline-block size-2 rounded-full bg-error align-middle" aria-label="có mới" />}</TabsTrigger>
			</TabsList>

			<TabsContent value="today" className="space-y-5 pt-5">
				<section className="mode-card flex flex-wrap items-center gap-5" aria-label="Mục tiêu ngày">
					<GoalRing value={board.today.xp} max={board.today.goal} size={104} stroke={10} label="Mục tiêu ngày">
						<span className="game-number text-3xl tabular-nums">{board.today.xp}</span><span className="text-xs text-muted">/{board.today.goal} XP</span>
					</GoalRing>
					<div className="min-w-0 flex-1 space-y-2">
						<h2 className="text-2xl">Mục tiêu ngày</h2>
						<p className="text-sm">{goalMessage(board.today.xp, board.today.goal)}</p>
						<button type="button" onClick={() => setGoalOpen(true)} className="inline-flex min-h-11 items-center gap-1 rounded-control border border-border px-3 text-sm font-bold hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Mức: {goalLabel(board.dailyGoalXp)} ▾</button>
						{board.dailyGoalXp !== board.today.goal && <p className="text-xs text-muted">Mức mới ({board.dailyGoalXp} XP) áp dụng từ ngày mai.</p>}
					</div>
				</section>
				<section aria-labelledby="daily-heading">
					<div className="flex items-baseline justify-between gap-2"><h2 id="daily-heading" className="text-2xl">Nhiệm vụ hôm nay</h2><p className="text-xs text-muted">Làm mới sau {dayResetsIn}</p></div>
					<ul className="mt-3 space-y-2">{board.today.quests.map((quest) => <QuestItem key={quest.key} quest={quest} quizHref={quizHref} />)}</ul>
				</section>
				<section className="mode-card" aria-labelledby="week-strip-heading">
					<h2 id="week-strip-heading" className="text-xl">Tuần của bạn</h2>
					<div className="mt-3"><WeekStrip days={board.week.days} /></div>
				</section>
			</TabsContent>

			<TabsContent value="week" className="space-y-5 pt-5">
				<div className="flex items-baseline justify-between gap-2"><h2 className="text-2xl">Nhiệm vụ tuần</h2><p className="text-xs text-muted">Còn {weekResetsIn}</p></div>
				<ul className="space-y-2">{board.week.quests.map((quest) => <QuestItem key={quest.key} quest={quest} quizHref={quizHref} />)}</ul>
				<section className={`flex items-center gap-4 rounded-panel border-2 p-5 ${board.week.chestOpened ? 'game-card-amber' : 'border-dashed border-border bg-surface'}`} aria-label="Rương tuần">
					<span className={board.week.chestOpened ? 'animate-badge-pop' : 'opacity-60 grayscale'}><AdventureIcon name="chest" size={40} framed /></span>
					<div className="min-w-0 flex-1">
						<p className="font-black">{board.week.chestOpened ? 'Đã mở rương tuần!' : 'Rương tuần'}</p>
						<p className="text-sm text-muted">{board.week.chestOpened ? `+${board.week.chestXp} XP đã vào túi. Tuần sau gặp lại.` : `Xong ${weekDone}/${board.week.quests.length} nhiệm vụ tuần để mở: +${board.week.chestXp} XP.`}</p>
						{!board.week.chestOpened && <div className="segment-progress mt-2">{board.week.quests.map((quest) => <span key={quest.key} data-done={quest.done} />)}</div>}
					</div>
				</section>
				<section className="mode-card"><h2 className="text-xl">Tuần của bạn</h2><div className="mt-3"><WeekStrip days={board.week.days} /></div></section>
			</TabsContent>

			<TabsContent value="achievements" className="space-y-6 pt-5">
				<AchievementList board={board} onOpen={setDetail} />
			</TabsContent>
		</Tabs>

		<DailyGoalSheet open={goalOpen} onClose={() => setGoalOpen(false)} current={board.dailyGoalXp} todayGoal={board.today.goal} />
		<Sheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? 'Thành tựu'}>
			{detail && <AchievementDetail achievement={detail} />}
		</Sheet>
	</div>;
}

function AchievementList({ board, onOpen }: { board: GoalBoard; onOpen: (achievement: GoalAchievement) => void }) {
	const byId = new Map(board.achievements.map((entry) => [entry.id, entry]));
	const nearest = board.nearest.flatMap((id) => byId.get(id) ?? []);
	const groups = Object.keys(ACHIEVEMENT_GROUPS) as AchievementGroup[];
	return <>
		{nearest.length > 0 && <section aria-labelledby="near-heading">
			<h2 id="near-heading" className="text-2xl">Sắp đạt</h2>
			<ul className="mt-3 grid gap-2 sm:grid-cols-3">{nearest.map((entry) => <li key={entry.id}>
				<button type="button" onClick={() => onOpen(entry)} className="game-card-lilac flex w-full flex-col gap-2 rounded-card border-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
					<span className="flex items-center gap-2"><AdventureIcon name={entry.icon as AchievementIcon} size={20} framed /><span className="font-bold">{entry.title}</span></span>
					<span className="text-xs text-muted">{entry.current}/{entry.next}</span>
					<span className="h-2 overflow-hidden rounded-full bg-accent-subtle"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round((entry.current / (entry.next ?? 1)) * 100)}%` }} /></span>
				</button>
			</li>)}</ul>
		</section>}
		{groups.map((group) => {
			const entries = board.achievements.filter((entry) => entry.group === group);
			if (!entries.length) return null;
			return <section key={group} aria-labelledby={`group-${group}`}>
				<h2 id={`group-${group}`} className="text-xl">{ACHIEVEMENT_GROUPS[group]}</h2>
				<ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{entries.map((entry) => <li key={entry.id}><AchievementBadge achievement={entry} onOpen={onOpen} /></li>)}</ul>
			</section>;
		})}
	</>;
}

function AchievementBadge({ achievement, onOpen }: { achievement: GoalAchievement; onOpen: (achievement: GoalAchievement) => void }) {
	const locked = achievement.reached === 0;
	const multi = achievement.tiers.length > 1;
	return <button type="button" onClick={() => onOpen(achievement)} aria-label={`${achievement.title}: ${locked ? 'chưa mở' : multi ? `bậc ${TIER_NAMES[achievement.reached - 1]}` : 'đã mở'}`} className={`flex h-full w-full flex-col items-center gap-1.5 rounded-card border-2 p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${locked ? 'border-dashed border-border bg-surface' : 'game-card-amber'}`}>
		<span className={locked ? 'opacity-50 grayscale' : ''}><AdventureIcon name={achievement.icon as AchievementIcon} size={30} framed /></span>
		<span className="text-sm font-bold leading-tight">{achievement.title}</span>
		{multi && <span className="flex gap-0.5" aria-hidden="true">{achievement.tiers.map((target, index) => <span key={target} className={index < achievement.reached ? 'text-gold' : 'text-border'}>★</span>)}</span>}
		<span className="text-[11px] text-muted tabular-nums">{achievement.next === null ? 'Hoàn tất' : `${Math.min(achievement.current, achievement.next)}/${achievement.next}`}</span>
	</button>;
}

function AchievementDetail({ achievement }: { achievement: GoalAchievement }) {
	const multi = achievement.tiers.length > 1;
	return <div className="space-y-4">
		<div className="flex items-center gap-3"><AdventureIcon name={achievement.icon as AchievementIcon} size={36} framed /><p className="text-sm text-muted">{ACHIEVEMENT_GROUPS[achievement.group as AchievementGroup]}</p></div>
		<ol className="space-y-2">{achievement.tiers.map((target, index) => {
			const reached = index < achievement.reached;
			return <li key={target} className={`flex items-center justify-between gap-3 rounded-card border p-3 ${reached ? 'border-success/50 bg-success-subtle' : 'border-border'}`}>
				<span><span className="font-bold">{multi ? TIER_NAMES[index] : 'Mục tiêu'}</span><span className="block text-sm text-muted">{achievement.template.replace('{n}', String(target))}</span></span>
				<span className="text-sm font-bold tabular-nums">{reached ? '✓' : `${Math.min(achievement.current, target)}/${target}`}</span>
			</li>;
		})}</ol>
	</div>;
}
