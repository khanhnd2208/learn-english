'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LanguageSwitch from '@/components/english/LanguageSwitch';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { ENGLISH_ADMIN_NAV, ENGLISH_NAV, isNavActive } from '@/config/navigation';

export default function EnglishShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data } = useSession();
	const admin = (data?.user as { role?: string } | undefined)?.role === 'admin';

	return (
		<div className="relative min-h-screen md:pl-[var(--sidebar-width)]">
			<aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-border bg-surface md:flex">
				<div className="px-6 pt-8">
					<Link href="/" className="text-2xl font-black tracking-tight text-foreground">Tiếng Anh</Link>
					<div className="mt-4">
						<LanguageSwitch />
					</div>
				</div>
				<nav className="mt-8 flex flex-1 flex-col gap-1">
					{ENGLISH_NAV.map((item) => {
						const active = isNavActive(pathname, item.href);
						return (
							<Link key={item.href} href={item.href} className={active ? 'nav-pill-active' : 'nav-pill'}>
								<MaterialIcon name={item.icon} filled={active} size={20} />
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
										<MaterialIcon name={item.icon} filled={active} size={20} />
										<span>{item.label}</span>
									</Link>
								);
							})}
						</div>
					)}
				</nav>
			</aside>
			<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 md:hidden">
				<Link href="/" className="text-xl font-black text-accent">Tiếng Anh</Link>
				<LanguageSwitch />
			</header>
			<main className="min-h-screen bg-background pb-24 md:pb-0">{children}</main>
			<nav className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t border-border bg-surface px-2 md:hidden">
				{ENGLISH_NAV.map((item) => {
					const active = isNavActive(pathname, item.href);
					return (
						<Link key={item.href} href={item.href} className={`flex flex-1 flex-col items-center text-[10px] font-bold ${active ? 'text-accent' : 'text-muted'}`}>
							<MaterialIcon name={item.icon} filled={active} size={20} />
							{item.shortLabel}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
