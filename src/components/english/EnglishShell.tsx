'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { ENGLISH_ADMIN_NAV, ENGLISH_NAV, isNavActive } from '@/config/navigation';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useToast } from '@/components/ui/Toast';
import { DAILY_TASK_TOTAL } from '@/lib/english/reviewSummary';

const navAdventureIcons: Record<string, 'map' | 'target' | 'book' | 'compass' | 'flag'> = {
	map: 'map', target: 'target', auto_stories: 'book', explore: 'compass', edit_note: 'flag',
};

export default function EnglishShell({ children, taskCount = 0 }: { children: React.ReactNode; taskCount?: number }) {
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
				<Link href="/" className="mx-4 mb-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground hover:border-accent">Nhiệm vụ hôm nay <span className={taskCount === DAILY_TASK_TOTAL ? 'text-success' : 'text-accent'}>{taskCount}/{DAILY_TASK_TOTAL}</span></Link>
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
				<button type="button" onClick={handleSignOut} disabled={signingOut} className="flex min-h-11 items-center gap-1 rounded-control px-2 text-xs font-bold text-foreground-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50" aria-label={signingOut ? 'Đang đăng xuất' : 'Đăng xuất'}>
					<MaterialIcon name="logout" size={18} /><span>Đăng xuất</span>
				</button>
			</header>
			<main className="min-h-screen bg-background pb-24 md:pb-0">{children}</main>
			<nav className="adventure-mobile-nav fixed bottom-0 z-50 flex h-[72px] w-full items-center justify-around border-t px-2 md:hidden">
				{ENGLISH_NAV.map((item) => {
					const active = isNavActive(pathname, item.href);
					return (
						<Link key={item.href} href={item.href} className={`flex flex-1 flex-col items-center gap-1 text-[10px] font-bold ${active ? 'text-amber-200' : 'text-emerald-100/65'}`}>
							<AdventureIcon name={navAdventureIcons[item.icon] ?? 'map'} size={21} />
							{item.shortLabel}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
