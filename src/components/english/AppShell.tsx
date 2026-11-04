'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { NavLink } from '@/config/navigation';
import ModeSwitch, { rememberPath } from '@/components/english/ModeSwitch';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import AccountMenu from '@/components/english/AccountMenu';
import OnboardingTour from '@/components/english/OnboardingTour';
import GoalRing from '@/components/english/goals/GoalRing';
import RewardCenter, { type ShellGoals } from '@/components/english/goals/RewardCenter';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Props {
	children: React.ReactNode;
	nav: NavLink[];
	adminNav: NavLink[];
	adminHref: string;
	brandHref: string;
	tagline: string;
	isActive: (pathname: string, href: string) => boolean;
	/** True on full-screen pages (quiz, test paper) where the shell steps aside. */
	focus: boolean;
	avatarUrl: string | null;
	hasUpload: boolean;
	/** Vocab area only: today's XP, level and quests. */
	goals?: ShellGoals;
	newLearner?: boolean;
}

/** Sidebar on desktop, top bar and bottom tabs on phones; shared by the Vocab and Test areas. */
export default function AppShell({ children, nav, adminNav, adminHref, brandHref, tagline, isActive, focus, avatarUrl, hasUpload, goals, newLearner = false }: Props) {
	const pathname = usePathname();
	const { data } = useSession();
	const admin = (data?.user as { role?: string } | undefined)?.role === 'admin';
	const accountName = data?.user?.name || data?.user?.email || 'Tài khoản';

	useEffect(() => { if (!focus) rememberPath(pathname); }, [pathname, focus]);

	if (focus) return <main className="min-h-screen bg-background">{children}</main>;

	const account = <AccountMenu name={accountName} goals={goals} admin={admin} adminHref={adminHref} avatarUrl={avatarUrl} hasUpload={hasUpload} />;
	const links = (items: NavLink[]) => items.map((item) => (
		<Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined} className={isActive(pathname, item.href) ? 'nav-pill-active' : 'nav-pill'}>
			<span className="nav-glyph flex size-8 items-center justify-center"><MaterialIcon name={item.icon} size={20} /></span>
			<span>{item.label}</span>
		</Link>
	));

	return (
		<div className="relative min-h-screen md:pl-[var(--sidebar-width)]">
			<aside className="adventure-sidebar fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r md:flex">
				<div className="px-5 pt-7">
					<Link href={brandHref} className="brand-wordmark flex items-center gap-3 text-xl font-black tracking-tight"><span className="brand-compass"><AdventureIcon name="compass" size={22} /></span><span className="leading-tight">Word<span className="brand-accent">Quest</span><small className="brand-tagline mt-0.5 block text-xs font-medium tracking-normal">{tagline}</small></span></Link>
				</div>
				<div className="px-5 pt-4"><ModeSwitch /></div>
				<nav aria-label="Điều hướng chính" className="mt-8 flex flex-1 flex-col gap-1">
					{links(nav)}
					{admin && (
						<div className="mt-3 border-t border-border pt-3">
							<p className="label-caps px-6 pb-2">Quản trị</p>
							{links(adminNav)}
						</div>
					)}
				</nav>
				{goals && (
					<Link href="/progress" aria-label={`Hôm nay ${goals.xp}/${goals.goal} XP, nhiệm vụ ${goals.questsDone}/${goals.questsTotal}`} className="mx-4 mb-2 flex items-center gap-3 rounded-card border border-border bg-surface p-3 text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
						<GoalRing value={goals.xp} max={goals.goal} size={36} stroke={4} label="Mục tiêu ngày">{goals.xp >= goals.goal && <MaterialIcon name="check" size={18} className="text-success" />}</GoalRing>
						<span className="min-w-0"><span className="block text-sm font-bold tabular-nums">{goals.xp}/{goals.goal} XP</span><span className="block text-xs text-muted">Cấp {goals.level} · Nhiệm vụ {goals.questsDone}/{goals.questsTotal}</span></span>
					</Link>
				)}
				<div className="mx-3 mb-3 border-t border-border pt-2">{account}</div>
			</aside>
			<header className="adventure-mobile-header sticky top-0 z-30 flex h-14 items-center justify-between border-b px-3.5 md:hidden">
				<ModeSwitch />
				<div className="flex items-center gap-1">
					{goals && (
						<Link href="/progress" aria-label={`Mục tiêu ngày ${goals.xp}/${goals.goal} XP, cấp ${goals.level}`} className="flex min-h-11 items-center gap-1.5 rounded-control px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
							<GoalRing value={goals.xp} max={goals.goal} size={26} stroke={4} label="Mục tiêu ngày">{goals.xp >= goals.goal && <MaterialIcon name="check" size={14} className="text-success" />}</GoalRing>
							{goals.xp > 0 && <span className="rounded-full bg-accent-subtle px-2 py-1 text-xs font-bold tabular-nums">{goals.xp}/{goals.goal}</span>}
							<span className="level-badge text-xs">Cấp {goals.level}</span>
						</Link>
					)}
					{account}
				</div>
			</header>
			<main className="min-h-screen bg-background pb-20 md:pb-0">{children}</main>
			{goals && <RewardCenter goals={goals} />}
			{goals && <OnboardingTour eligible={newLearner} />}
			<nav aria-label="Điều hướng chính" className="adventure-mobile-nav fixed bottom-0 z-50 flex min-h-16 w-full items-center justify-around border-t px-1.5 pb-safe md:hidden">
				{nav.map((item) => {
					const active = isActive(pathname, item.href);
					return (
						<Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className="mobile-nav-link relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-control py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
							<span className={`flex items-center justify-center rounded-full px-3.5 py-0.5 transition-colors ${active ? 'bg-accent-subtle text-accent' : ''}`}>
								<MaterialIcon name={item.icon} filled={active} size={22} />
							</span>
							<span>{item.shortLabel ?? item.label}</span>
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
