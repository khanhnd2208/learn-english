'use client';

import { usePathname } from 'next/navigation';
import { TEST_ADMIN_NAV, TEST_NAV, isTestNavActive } from '@/config/testNavigation';
import AppShell from '@/components/english/AppShell';

export default function TestShell({ children, avatarUrl, hasUpload }: { children: React.ReactNode; avatarUrl: string | null; hasUpload: boolean }) {
	const pathname = usePathname();
	const focus = /^\/tests\/papers\/[^/]+$/.test(pathname);
	return <AppShell nav={TEST_NAV} adminNav={TEST_ADMIN_NAV} adminHref="/admin/tests" brandHref="/tests" tagline="Luyện đề kiểm tra" isActive={isTestNavActive} focus={focus} avatarUrl={avatarUrl} hasUpload={hasUpload}>{children}</AppShell>;
}
