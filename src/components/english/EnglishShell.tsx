'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { ENGLISH_ADMIN_NAV, ENGLISH_NAV, isNavActive } from '@/config/navigation';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useToast } from '@/components/ui/Toast';
import GoalRing from '@/components/english/goals/GoalRing';
import RewardCenter, { type ShellGoals } from '@/components/english/goals/RewardCenter';

const navAdventureIcons: Record<string, 'map' | 'target' | 'book' | 'compass' | 'flag' | 'trophy'> = {
	map: 'map', target: 'target', auto_stories: 'book', explore: 'compass', edit_note: 'flag', flag: 'trophy',
};

function NavDot({ show }: { show: boolean }) {
	return show ? <span aria-label="Có thành tựu mới" className="size-2 rounded-full bg-error" /> : null;
}

export default function EnglishShell({ children, goals }: { children: React.ReactNode; goals: ShellGoals }) {
	const pathname = usePathname();
	const focus = /\/sets\/[^/]+\/(practice|test)$/.test(pathname);
	const { data } = useSession();
	const { toast } = useToast();
	const [signingOut, setSigningOut] = useState(false);
	const admin = (data?.user as { role?: string } | undefined)?.role === 'admin';
	const accountName = data?.user?.name || data?.user?.email || 'Tài khoản';

	async function handleSignOut() {
		setSigningOut(true);
		try {
			await signOut({ redirectTo: '/login' });
		} catch {
			setSigningOut(false);
			toast('Không thể đăng xuất. Vui lòng thử lại.', 'error');
		}
	}

	if (focus) return <main className="min-h-screen bg-background">{children}</main>;
	return (
		<div className="relative min-h-screen md:pl-[var(--sidebar-width)]">
			<aside className="adventure-sidebar fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r md:flex">
				<div className="px-5 pt-7">
					<Link href="/" className="flex items-center gap-3 text-xl font-black tracking-tight text-white"><span className="brand-compass"><AdventureIcon name="compass" size={22} /></span><span>WORD<span className="text-amber-300">QUEST</span><small className="mt-0.5 block text-[9px] font-bold tracking-[.2em] text-emerald-100/70">VOCABULARY ADVENTURE</small></span></Link>
				</div>
				<nav className="mt-8 flex flex-1 flex-col gap-1">
					{ENGLISH_NAV.map((item) => {
						const active = isNavActive(pathname, item.href);
						return (
							<Link key={item.href} href={item.href} className={active ? 'nav-pill-active' : 'nav-pill'}>
								<span className="nav-glyph"><AdventureIcon name={navAdventureIcons[item.icon] ?? 'map'} size={19} /></span>
								<span>{item.label}</span>
								{item.href === '/quests' && <NavDot show={goals.unseen.length > 0} />}
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
				<Link href="/quests" aria-label={`Hôm nay ${goals.xp}/${goals.goal} XP, nhiệm vụ ${goals.questsDone}/${goals.questsTotal}`} className="mx-4 mb-2 flex items-center gap-3 rounded-card border border-border bg-surface p-3 text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
					<GoalRing value={goals.xp} max={goals.goal} size={46} stroke={5} label="Mục tiêu ngày"><span className="text-[11px] font-black tabular-nums">{Math.min(goals.xp, goals.goal)}</span><span className="text-[8px] text-muted">/{goals.goal}</span></GoalRing>
					<span className="min-w-0 text-xs"><span className="flex items-center gap-1.5"><span className="level-badge text-[10px]">Lv {goals.level}</span><span className="truncate font-bold">{goals.levelTitle}</span></span><span className={`mt-1 block font-bold ${goals.questsDone === goals.questsTotal ? 'text-success' : 'text-muted'}`}>Nhiệm vụ {goals.questsDone}/{goals.questsTotal}</span></span>
				</Link>
				<div className="sidebar-quest m-4 rounded-2xl p-4"><AdventureIcon name="mountain" size={24} /><p className="mt-2 text-xs font-black text-white">Mỗi từ là một vùng đất mới.</p><p className="mt-1 text-[10px] text-emerald-100/70">Khám phá theo nhịp của bạn.</p></div>
				<div className="mx-4 mb-4 border-t border-border pt-3">
					<p className="truncate px-2 text-sm font-bold text-foreground" title={accountName}>{accountName}</p>
					<button type="button" onClick={handleSignOut} disabled={signingOut} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-sm font-bold text-foreground-secondary hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
						<MaterialIcon name="logout" size={18} />{signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
					</button>
				</div>
			</aside>
			<header className="adventure-mobile-header sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 md:hidden">
				<Link href="/" className="flex items-center gap-2 text-lg font-black text-white"><span className="brand-compass"><AdventureIcon name="compass" size={18} /></span><span>WORD<span className="text-amber-300">QUEST</span></span></Link>
				<div className="flex items-center gap-1">
					<Link href="/quests" aria-label={`Mục tiêu ngày ${goals.xp}/${goals.goal} XP`} className="flex min-h-11 items-center gap-1.5 rounded-control px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
						<GoalRing value={goals.xp} max={goals.goal} size={32} stroke={4} label="Mục tiêu ngày"><span className={`font-black tabular-nums ${goals.xp >= goals.goal ? 'text-sm text-success' : 'text-[9px] text-foreground'}`}>{goals.xp >= goals.goal ? '✓' : `${Math.round((goals.xp / Math.max(1, goals.goal)) * 100)}%`}</span></GoalRing>
						<span className="level-badge text-[10px]">Lv {goals.level}</span>
					</Link>
					<button type="button" onClick={handleSignOut} disabled={signingOut} className="flex min-h-11 items-center gap-1 rounded-control px-2 text-xs font-bold text-foreground-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50" aria-label={signingOut ? 'Đang đăng xuất' : 'Đăng xuất'}>
						<MaterialIcon name="logout" size={18} /><span className="hidden min-[400px]:inline">Đăng xuất</span>
					</button>
				</div>
			</header>
			<main className="min-h-screen bg-background pb-24 md:pb-0">{children}</main>
			<RewardCenter goals={goals} />
			<nav className="adventure-mobile-nav fixed bottom-0 z-50 flex h-[72px] w-full items-center justify-around border-t px-2 md:hidden">
				{ENGLISH_NAV.map((item) => {
					const active = isNavActive(pathname, item.href);
					return (
						<Link key={item.href} href={item.href} className={`relative flex flex-1 flex-col items-center gap-1 text-[10px] font-bold ${active ? 'text-amber-200' : 'text-emerald-100/65'}`}>
							<AdventureIcon name={navAdventureIcons[item.icon] ?? 'map'} size={21} />
							{item.href === '/quests' && goals.unseen.length > 0 && <span aria-label="Có thành tựu mới" className="absolute top-0 right-[calc(50%-16px)] size-2 rounded-full bg-error" />}
							{item.shortLabel}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
