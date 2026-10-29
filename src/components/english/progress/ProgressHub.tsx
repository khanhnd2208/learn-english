'use client';

import Link from 'next/link';
import { useState } from 'react';
import InfoHint from '@/components/ui/InfoHint';
import Sheet from '@/components/ui/Sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import DueForecast from '@/components/english/DueForecast';
import DailyGoalSheet from '@/components/english/goals/DailyGoalSheet';
import GoalRing from '@/components/english/goals/GoalRing';
import LevelBar from '@/components/english/goals/LevelBar';
import QuestItem from '@/components/english/goals/QuestItem';
import { MiniBarChart, StageDonut, StatTile, type ChartBar } from '@/components/english/progress/charts';
import { ACHIEVEMENT_GROUPS, TIER_NAMES, type AchievementGroup, type AchievementIcon } from '@/lib/english/achievements';
import { HINTS } from '@/lib/english/hintCopy';
import { accuracySeries, shortDayLabel, weekDelta, weekXpSummary, type WeekHistory } from '@/lib/english/progressStats';
import type { countStages } from '@/lib/english/schedule';
import { STAGE_META } from '@/lib/english/stageMeta';
import { DAILY_GOAL_TIERS, XP } from '@/lib/english/xp';
import type { GoalAchievement, GoalBoard } from '@/services/english/enGoalService';

export type ProgressTab = 'quests' | 'stats' | 'achievements';
type Stages = ReturnType<typeof countStages>;
type WrongWord = { id: string; count: number; lemma: string; meaning: string };

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function goalLabel(xp: number): string {
	return DAILY_GOAL_TIERS.find((tier) => tier.xp === xp)?.label ?? `${xp} XP`;
}

/** Encouraging copy for the daily ring; never blames a learner for a slow day. */
function goalMessage(xp: number, goal: number): string {
	if (xp >= goal) return 'Đã đạt mục tiêu hôm nay. Phần còn lại là thưởng thêm!';
	if (xp === 0) return 'Một lượt ôn ngắn là đủ để bắt đầu.';
	const left = goal - xp;
	return left <= 100 ? `Còn ${left} XP, chỉ vài câu nữa thôi.` : `Còn ${left} XP, khoảng ${Math.max(1, Math.ceil(left / (XP.srs * 3)))} phút ôn.`;
}

function comparison(value: number, unit = ''): string {
	return value > 0 ? `tăng ${value}${unit} so với tuần trước` : value < 0 ? `giảm ${Math.abs(value)}${unit} so với tuần trước` : 'bằng tuần trước';
}

/** The progress hub: a player card on top, then quests, charts and achievements as tabs. */
export default function ProgressHub({ board, weeks, wrong, stages, dueNext7Days, dayResetsIn, weekResetsIn, initialTab }: {
	board: GoalBoard;
	weeks: WeekHistory[];
	wrong: WrongWord[];
	stages: Stages;
	dueNext7Days: Array<{ day: string; count: number }>;
	dayResetsIn: string;
	weekResetsIn: string;
	initialTab: ProgressTab;
}) {
	const [tab, setTab] = useState<ProgressTab>(initialTab);
	const [goalOpen, setGoalOpen] = useState(false);
	const [detail, setDetail] = useState<GoalAchievement | null>(null);
	const accuracy = accuracySeries(weeks);
	const thisWeek = accuracy.at(-1)!;
	const accuracyDelta = weekDelta(thisWeek.percent, accuracy.at(-2)?.percent ?? null);
	const longTermDelta = weeks.at(-1)!.longTerm - (weeks.at(-2)?.longTerm ?? 0);
	const unlocked = board.achievements.reduce((sum, entry) => sum + entry.reached, 0);
	const tierCount = board.achievements.reduce((sum, entry) => sum + entry.tiers.length, 0);

	function changeTab(value: string) {
		setTab(value as ProgressTab);
		try { window.history.replaceState(null, '', `/progress?tab=${value}`); } catch { /* address bar is a convenience */ }
	}

	return <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-8">
		<header className="game-hero relative overflow-hidden rounded-panel border-2 p-3.5 sm:p-5" style={{ minHeight: 0 }}>
			<div className="flex items-center gap-2.5 sm:gap-3">
				<span className="level-badge px-2 py-1 text-base sm:text-lg">Lv {board.level.level}</span>
				<h1 className="min-w-0 flex-1 truncate text-xl sm:text-2xl">{board.level.title}</h1>
				<span className="shrink-0 text-xs font-bold tabular-nums sm:text-sm">{board.level.total} XP</span>
			</div>
			<div className="mt-2.5 sm:mt-3"><LevelBar level={board.level} label={false} /></div>
			<div className="mt-3.5 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-4">
				<StatTile icon="spark" value={board.streak.current} label="Chuỗi ngày học" note={`Kỷ lục ${board.streak.longest} ngày`} />
				<StatTile icon="sprout" value={board.longTermCount} label="Từ nhớ lâu" note={comparison(longTermDelta)} tone={longTermDelta > 0 ? 'up' : longTermDelta < 0 ? 'down' : 'muted'} />
				<StatTile icon="target" value={thisWeek.percent === null ? '—' : `${thisWeek.percent}%`} label="Trả lời đúng (tuần này)" note={accuracyDelta === null ? (thisWeek.answers ? `${thisWeek.correct}/${thisWeek.answers} câu đúng` : 'Chưa ôn tuần này') : comparison(accuracyDelta, '%')} tone={accuracyDelta === null || accuracyDelta === 0 ? 'muted' : accuracyDelta > 0 ? 'up' : 'down'} />
				<StatTile icon="trophy" value={`${unlocked}/${tierCount}`} label="Huy hiệu đã mở" note={board.unseenAchievements.length ? `${board.unseenAchievements.length} mới!` : undefined} tone="up" />
			</div>
		</header>

		<Tabs value={tab} onValueChange={changeTab}>
			<TabsList>
				<TabsTrigger value="quests">Nhiệm vụ</TabsTrigger>
				<TabsTrigger value="stats">Thống kê</TabsTrigger>
				<TabsTrigger value="achievements">Thành tựu{board.unseenAchievements.length > 0 && <span className="ml-1.5 inline-block size-2 rounded-full bg-error align-middle" aria-label="có mới" />}</TabsTrigger>
			</TabsList>

			<TabsContent value="quests" className="pt-5">
				<QuestsTab board={board} dayResetsIn={dayResetsIn} weekResetsIn={weekResetsIn} onGoal={() => setGoalOpen(true)} />
			</TabsContent>

			<TabsContent value="stats" className="pt-5">
				<StatsTab board={board} weeks={weeks} wrong={wrong} stages={stages} dueNext7Days={dueNext7Days} />
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

function QuestsTab({ board, dayResetsIn, weekResetsIn, onGoal }: { board: GoalBoard; dayResetsIn: string; weekResetsIn: string; onGoal: () => void }) {
	const week = board.week.quests[0];
	const weekPercent = week && week.target > 0 ? Math.min(100, Math.round((week.current / week.target) * 100)) : 0;
	return <div className="grid gap-4 md:grid-cols-2 md:items-start">
		<div className="space-y-4">
			<section className="mode-card flex items-center gap-4" aria-label="Mục tiêu ngày">
				<GoalRing value={board.today.xp} max={board.today.goal} size={76} stroke={8} label="Mục tiêu ngày">
					<span className="game-number text-xl tabular-nums">{board.today.xp}</span><span className="text-xs text-muted">/{board.today.goal}</span>
				</GoalRing>
				<div className="min-w-0 flex-1">
					<h2 className="flex items-center gap-1.5 text-xl">Mục tiêu ngày<InfoHint title={HINTS.xp.title}>{HINTS.xp.body}</InfoHint></h2>
					<p className="text-sm">{goalMessage(board.today.xp, board.today.goal)}</p>
					<button type="button" onClick={onGoal} className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-control border border-border px-3 text-sm font-bold hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Đổi mục tiêu: {goalLabel(board.dailyGoalXp)} ▾</button>
				</div>
			</section>
			<section aria-labelledby="daily-heading">
				<div className="flex items-baseline justify-between gap-2"><h2 id="daily-heading" className="text-xl">Nhiệm vụ hôm nay</h2><p className="text-xs text-muted">Làm mới sau {dayResetsIn}</p></div>
				<ul className="mt-3 space-y-2">{board.today.quests.map((quest) => <QuestItem key={quest.key} quest={quest} />)}</ul>
			</section>
		</div>

		<section aria-labelledby="week-heading" className={`rounded-panel border-2 p-4 ${board.week.chestOpened ? 'game-card-amber' : 'game-card-lilac'}`}>
			<div className="flex items-baseline justify-between gap-2"><h2 id="week-heading" className="text-xl">Nhiệm vụ tuần</h2><p className="text-xs text-muted">Còn {weekResetsIn}</p></div>
			{week && <p className="mt-1 font-bold">{week.title}</p>}
			<div className="mt-4 flex items-center gap-3">
				<div className="min-w-0 flex-1">
					<div className="game-progress-track h-4 overflow-hidden" role="progressbar" aria-label="Tiến độ nhiệm vụ tuần" aria-valuemin={0} aria-valuemax={week?.target ?? 0} aria-valuenow={week?.current ?? 0}>
						<div className="game-progress-fill h-full transition-all duration-700 motion-reduce:transition-none" style={{ width: `${weekPercent}%` }} />
					</div>
					<p className="mt-1 text-xs font-bold tabular-nums text-muted">{week?.current ?? 0}/{week?.target ?? 0} ngày có học</p>
				</div>
				<span className={board.week.chestOpened ? 'animate-badge-pop' : week?.done ? '' : 'opacity-60 grayscale'}><AdventureIcon name="chest" size={40} framed /></span>
			</div>
			<ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Các ngày trong tuần">{board.week.days.map((day, index) => <li key={day.day} aria-label={`${WEEKDAY_LABELS[index]}: ${day.goalMet ? 'đạt mục tiêu' : day.studied ? 'có học' : day.isFuture ? 'chưa tới' : 'nghỉ'}`} className={`flex flex-col items-center rounded-md border-2 py-1.5 text-xs font-bold ${day.goalMet ? 'border-success bg-success text-white' : day.studied ? 'border-accent bg-accent-subtle text-accent' : day.isFuture ? 'border-dashed border-border text-muted' : 'border-border bg-surface text-muted'} ${day.isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}>
				<span>{WEEKDAY_LABELS[index]}</span><span aria-hidden="true" className="h-4 leading-4">{day.goalMet ? '✓' : day.studied ? '◐' : ''}</span>
			</li>)}</ol>
			<p className="mt-3 text-sm">{board.week.chestOpened ? `Đã mở rương: +${board.week.chestXp} XP đã vào túi.` : `Đủ ngày để mở rương tuần: +${board.week.chestXp} XP.`}</p>
		</section>
	</div>;
}

function Card({ title, aside, children, className = '' }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
	return <section className={`stat-tile min-w-0 p-4 ${className}`}>
		<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="flex items-center gap-1.5 text-lg">{title}</h2>{aside}</div>
		{children}
	</section>;
}

function StatsTab({ board, weeks, wrong, stages, dueNext7Days }: { board: GoalBoard; weeks: WeekHistory[]; wrong: WrongWord[]; stages: Stages; dueNext7Days: Array<{ day: string; count: number }> }) {
	const week = weekXpSummary(board.week.days);
	const accuracy = accuracySeries(weeks);
	const thisWeek = accuracy.at(-1)!;
	const longTerm = weeks.at(-1)!.longTerm;
	const longTermDelta = longTerm - (weeks.at(-2)?.longTerm ?? 0);
	const last = weeks.length - 1;

	const dayBars: ChartBar[] = board.week.days.map((day, index) => ({
		key: day.day,
		label: WEEKDAY_LABELS[index]!,
		value: day.isFuture ? board.today.goal * 0.35 : day.xp,
		tone: day.isFuture ? 'future' : day.goalMet ? 'success' : day.isToday ? 'accent' : 'soft',
		highlight: day.isToday,
		display: day.isFuture || day.xp === 0 ? undefined : String(day.xp),
		title: `${WEEKDAY_LABELS[index]}: ${day.isFuture ? 'chưa tới' : `${day.xp} XP${day.goalMet ? ', đạt mục tiêu' : ''}`}`,
	}));
	const accuracyBars: ChartBar[] = accuracy.map((entry, index) => ({
		key: entry.start,
		label: shortDayLabel(entry.start),
		value: entry.percent,
		tone: entry.percent !== null && entry.percent >= 80 ? 'success' : index === last ? 'accent' : 'soft',
		highlight: index === last,
		display: entry.percent === null ? undefined : `${entry.percent}`,
		title: `Tuần bắt đầu ${shortDayLabel(entry.start)}: ${entry.percent === null ? 'chưa ôn' : `${entry.percent}% (${entry.correct}/${entry.answers} câu đúng)`}`,
	}));
	const longTermBars: ChartBar[] = weeks.map((entry, index) => ({
		key: entry.start,
		label: shortDayLabel(entry.start),
		value: entry.longTerm,
		tone: index === last ? 'success' : 'soft',
		highlight: index === last,
		display: entry.longTerm ? String(entry.longTerm) : undefined,
		title: `Tuần bắt đầu ${shortDayLabel(entry.start)}: ${entry.longTerm} từ nhớ lâu`,
	}));

	return <div className="grid gap-4 md:grid-cols-2">
		<Card title={<>Kho từ của bạn <InfoHint title={HINTS.stages.title}>{HINTS.stages.body}</InfoHint></>}>
			<p className="mt-1 mb-3 text-xs text-muted">Từ càng ôn đúng nhiều lần thì lịch ôn càng giãn ra và lên mức cao hơn.</p>
			<StageDonut stages={stages} />
			<h3 className="mt-4 text-sm font-bold">Lịch ôn 7 ngày tới</h3>
			<p className="text-xs text-muted">Mỗi cột là số từ đến hạn trong một ngày.</p>
			<div className="mt-2"><DueForecast days={dueNext7Days} height="h-20" /></div>
		</Card>

		<Card title="Tuần này" aside={<span className="xp-chip">{week.total} XP</span>}>
			<p className="mt-1 text-xs text-muted"><strong className="text-foreground">{week.studiedDays}/7</strong> ngày có học · <strong className="text-foreground">{week.goalDays}</strong> ngày đạt mục tiêu · cao nhất <strong className="text-foreground">{week.best} XP</strong>. Mỗi cột là một ngày.</p>
			<MiniBarChart label="XP mỗi ngày trong tuần" bars={dayBars} goal={{ value: board.today.goal, label: `Mục tiêu ${board.today.goal}` }} height={104} />
		</Card>

		<Card title="Tỉ lệ trả lời đúng" aside={<span className="game-number text-2xl tabular-nums">{thisWeek.percent === null ? '—' : `${thisWeek.percent}%`}</span>}>
			<p className="mt-1 text-xs text-muted">{thisWeek.answers ? `${thisWeek.correct}/${thisWeek.answers} câu ôn luân phiên đúng tuần này` : 'Tuần này chưa có lượt ôn luân phiên'} · Mỗi cột là một tuần, bắt đầu từ ngày ghi bên dưới.</p>
			<MiniBarChart label="Tỉ lệ trả lời đúng 8 tuần" bars={accuracyBars} max={100} band={{ from: 80, label: '≥80% tốt' }} height={104} empty="Chưa có lượt ôn luân phiên nào trong 8 tuần." />
		</Card>

		<Card title={<>Từ nhớ lâu <InfoHint title={HINTS.stages.title}>{HINTS.stages.body}</InfoHint></>} aside={<span className="game-number text-2xl tabular-nums">{longTerm}</span>}>
			{longTermDelta !== 0 && <p className={`mt-1 text-xs font-bold ${longTermDelta > 0 ? 'text-success' : 'text-error'}`}>{comparison(longTermDelta)}</p>}
			<p className="mt-1 text-xs text-muted">Số từ {STAGE_META.long_term.hint}, ước tính cuối mỗi tuần. Mỗi cột là một tuần, bắt đầu từ ngày ghi bên dưới.</p>
			<MiniBarChart label="Số từ nhớ lâu 8 tuần" bars={longTermBars} height={104} empty="Chưa có từ nào lên mức nhớ lâu. Ôn đúng đều đặn để từ lên mức." />
		</Card>

		<Card title="Từ hay sai" aside={<Link href="/review" className="inline-flex min-h-11 items-center text-sm font-bold text-accent">Ôn theo bộ →</Link>} className="md:col-span-2">
			{wrong.length
				? <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{wrong.map((word) => <li key={word.id} className="flex items-center gap-3 rounded-card border-2 border-border bg-surface px-3 py-2">
					<span className="min-w-0 flex-1"><strong className="block truncate">{word.lemma}</strong><span className="block truncate text-xs text-muted">{word.meaning}</span></span>
					<span className="shrink-0 rounded-full bg-error/12 px-2 py-0.5 text-xs font-black tabular-nums text-error" title={`${word.count} lần sai trong 8 tuần`}>×{word.count}</span>
				</li>)}</ul>
				: <p className="mt-2 text-sm text-muted">Chưa có từ sai trong 8 tuần qua. Giữ phong độ nhé!</p>}
		</Card>
	</div>;
}

function AchievementList({ board, onOpen }: { board: GoalBoard; onOpen: (achievement: GoalAchievement) => void }) {
	const byId = new Map(board.achievements.map((entry) => [entry.id, entry]));
	const nearest = board.nearest.flatMap((id) => byId.get(id) ?? []);
	const groups = Object.keys(ACHIEVEMENT_GROUPS) as AchievementGroup[];
	return <>
		{nearest.length > 0 && <section aria-labelledby="near-heading">
			<h2 id="near-heading" className="text-xl">Sắp đạt</h2>
			<ul className="mt-3 grid gap-3 sm:grid-cols-3">{nearest.map((entry) => <li key={entry.id}>
				<button type="button" onClick={() => onOpen(entry)} className="game-card-lilac flex w-full flex-col gap-2 rounded-card border-2 p-3 text-left shadow-[0_3px_0_var(--card-lilac-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
					<span className="flex items-center gap-2"><AdventureIcon name={entry.icon as AchievementIcon} size={28} framed /><span className="font-bold leading-tight">{entry.title}</span></span>
					<span className="game-progress-track h-3 overflow-hidden"><span className="game-progress-fill block h-full" style={{ width: `${Math.round((entry.current / (entry.next ?? 1)) * 100)}%` }} /></span>
					<span className="text-xs font-bold tabular-nums text-muted">{entry.current}/{entry.next}</span>
				</button>
			</li>)}</ul>
		</section>}
		{groups.map((group) => {
			const entries = board.achievements.filter((entry) => entry.group === group);
			if (!entries.length) return null;
			return <section key={group} aria-labelledby={`group-${group}`}>
				<h2 id={`group-${group}`} className="text-xl">{ACHIEVEMENT_GROUPS[group]}</h2>
				<ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">{entries.map((entry) => <li key={entry.id}><AchievementBadge achievement={entry} onOpen={onOpen} /></li>)}</ul>
			</section>;
		})}
	</>;
}

function AchievementBadge({ achievement, onOpen }: { achievement: GoalAchievement; onOpen: (achievement: GoalAchievement) => void }) {
	const locked = achievement.reached === 0;
	const multi = achievement.tiers.length > 1;
	return <button type="button" onClick={() => onOpen(achievement)} aria-label={`${achievement.title}: ${locked ? 'chưa mở' : multi ? `bậc ${TIER_NAMES[achievement.reached - 1]}` : 'đã mở'}`} className={`flex h-full w-full flex-col items-center gap-1 rounded-card border-2 p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${locked ? 'border-dashed border-border bg-surface' : 'game-card-amber shadow-[0_3px_0_var(--card-amber-border)]'}`}>
		<span className={locked ? 'opacity-50 grayscale' : ''}><AdventureIcon name={achievement.icon as AchievementIcon} size={28} framed /></span>
		<span className="text-sm font-bold leading-tight">{achievement.title}</span>
		{multi && <span className="flex gap-0.5" aria-hidden="true">{achievement.tiers.map((target, index) => <span key={target} className={index < achievement.reached ? 'text-gold' : 'text-border'}>★</span>)}</span>}
		<span className="text-xs text-muted tabular-nums">{achievement.next === null ? 'Hoàn tất' : `${Math.min(achievement.current, achievement.next)}/${achievement.next}`}</span>
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
