'use client';

import { usePathname } from 'next/navigation';
import { ADMIN_NAV, MAIN_NAV, isNavActive } from '@/config/navigation';
import AppShell from '@/components/english/AppShell';
import type { ShellGoals } from '@/components/english/goals/RewardCenter';

export default function VocabShell({ children, goals, newLearner, avatarUrl, hasUpload }: { children: React.ReactNode; goals: ShellGoals; newLearner: boolean; avatarUrl: string | null; hasUpload: boolean }) {
	const pathname = usePathname();
	const focus = /\/sets\/[^/]+\/(practice|test)$/.test(pathname);
	return <AppShell nav={MAIN_NAV} adminNav={ADMIN_NAV} adminHref="/admin" brandHref="/" tagline="Học từ vựng tiếng Anh" isActive={isNavActive} focus={focus} goals={goals} newLearner={newLearner} avatarUrl={avatarUrl} hasUpload={hasUpload}>{children}</AppShell>;
}
