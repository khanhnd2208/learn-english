'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ENGLISH_ADMIN_NAV, ENGLISH_NAV, isNavActive } from '@/config/navigation';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import AccountMenu from '@/components/english/AccountMenu';
import OnboardingTour from '@/components/english/OnboardingTour';
import GoalRing from '@/components/english/goals/GoalRing';
import RewardCenter, { type ShellGoals } from '@/components/english/goals/RewardCenter';

const navAdventureIcons: Record<string, 'map' | 'target' | 'book' | 'compass' | 'flag' | 'trophy'> = {
	map: 'map', target: 'target', auto_stories: 'book', explore: 'compass', edit_note: 'flag', flag: 'trophy',
};

function NavDot({ show }: { show: boolean }) {
	return show ? <span aria-label="Có thành tựu mới" className="size-2 rounded-full bg-error" /> : null;
}

export default function EnglishShell({ children, goals, newLearner }: { children: React.ReactNode; goals: ShellGoals; newLearner: boolean }) {
	const pathname = usePathname();
	const focus = /\/sets\/[^/]+\/(practice|test)$/.test(pathname);
	const { data } = useSession();
	const admin = (data?.user as { role?: string } | undefined)?.role === 'admin';
	const accountName = data?.user?.name || data?.user?.email || 'Tài khoản';

	if (focus) return <main className="min-h-screen bg-background">{children}</main>;
	return (
		<div className="relative min-h-screen md:pl-[var(--sidebar-width)]">
			<aside className="adventure-sidebar fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r md:flex">
				<div className="px-5 pt-7">
					<Link href="/" className="brand-wordmark flex items-center gap-3 text-xl font-black tracking-tight"><span className="brand-compass"><AdventureIcon name="compass" size={22} /></span><span>WORD<span className="brand-accent">QUEST</span><small className="brand-tagline mt-0.5 block text-xs font-bold tracking-[.12em]">VOCABULARY ADVENTURE</small></span></Link>
				</div>
				<nav className="mt-8 flex flex-1 flex-col gap-1">
					{ENGLISH_NAV.map((item) => {
						const active = isNavActive(pathname, item.href);
						return (
							<Link key={item.href} href={item.href} className={active ? 'nav-pill-active' : 'nav-pill'}>
								<span className="nav-glyph"><AdventureIcon name={navAdventureIcons[item.icon] ?? 'map'} size={19} /></span>
								<span>{item.label}</span>
								{item.href === '/progress' && <NavDot show={goals.unseen.length > 0} />}
							</Link>
						);
					})}
					{admin && (
						<div className="mt-3 border-t border-border pt-3">
							<p className="label-caps px-6 pb-2">Quản trị</p>
							{ENGLISH_ADMIN_NAV.map((item) => {
								const active = isNavActive(pathname, item.href);
								return (
									<Link key={item.href} href={item.href} className={active ? 'nav-pill-active' : 'nav-pill'}>
										<span className="nav-glyph"><AdventureIcon name={navAdventureIcons[item.icon] ?? 'flag'} size={19} /></span>
										<span>{item.label}</span>
									</Link>
								);
							})}
						</div>
					)}
				</nav>
				<Link href="/progress" aria-label={`Hôm nay ${goals.xp}/${goals.goal} XP, nhiệm vụ ${goals.questsDone}/${goals.questsTotal}`} className="mx-4 mb-2 flex items-center gap-3 rounded-card border border-border bg-surface p-3 text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
					<GoalRing value={goals.xp} max={goals.goal} size={36} stroke={4} label="Mục tiêu ngày">{goals.xp >= goals.goal && <span className="text-sm font-bold text-success">✓</span>}</GoalRing>
					<span className="min-w-0"><span className="block text-sm font-bold tabular-nums">{goals.xp}/{goals.goal} XP</span><span className="block text-xs text-muted">Lv {goals.level} · Nhiệm vụ {goals.questsDone}/{goals.questsTotal}</span></span>
				</Link>
				<div className="mx-4 mb-4 border-t border-border pt-3"><AccountMenu name={accountName} goals={goals} admin={admin} /></div>
			</aside>
			<header className="adventure-mobile-header sticky top-0 z-30 flex h-14 items-center justify-between border-b px-3.5 md:hidden">
				<Link href="/" className="brand-wordmark flex items-center gap-2 text-base font-black"><span className="brand-compass !size-8"><AdventureIcon name="compass" size={16} /></span><span>WORD<span className="brand-accent">QUEST</span></span></Link>
				<div className="flex items-center gap-1">
					<Link href="/progress" aria-label={`Mục tiêu ngày ${goals.xp}/${goals.goal} XP`} className="flex min-h-10 items-center gap-1.5 rounded-control px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
						<GoalRing value={goals.xp} max={goals.goal} size={26} stroke={4} label="Mục tiêu ngày">{goals.xp >= goals.goal && <span className="text-xs font-bold text-success">✓</span>}</GoalRing>
						<span className="rounded-full bg-accent-subtle px-2 py-1 text-xs font-bold tabular-nums">{goals.xp}/{goals.goal}</span>
						<span className="level-badge text-xs">Lv {goals.level}</span>
					</Link>
					<AccountMenu name={accountName} goals={goals} admin={admin} />
				</div>
			</header>
			<main className="min-h-screen bg-background pb-20 md:pb-0">{children}</main>
			<RewardCenter goals={goals} /><OnboardingTour eligible={newLearner} />
			<nav aria-label="Điều hướng chính" className="adventure-mobile-nav fixed bottom-0 z-50 flex min-h-16 w-full items-center justify-around border-t px-1.5 pb-safe md:hidden">
				{ENGLISH_NAV.map((item) => {
					const active = isNavActive(pathname, item.href);
					return (
						<Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className="mobile-nav-link relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-control py-1 text-[11px] font-bold">
							<span className={`flex items-center justify-center rounded-full px-2.5 py-0.5 transition-colors ${active ? 'bg-accent-subtle text-accent' : ''}`}>
								<AdventureIcon name={navAdventureIcons[item.icon] ?? 'map'} size={20} />
							</span>
							{item.href === '/progress' && goals.unseen.length > 0 && <span aria-label="Có thành tựu mới" className="absolute top-1 right-[calc(50%-16px)] size-2 rounded-full bg-error" />}
							<span>{item.shortLabel}</span>
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
