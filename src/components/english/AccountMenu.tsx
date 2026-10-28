'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from '@teispace/next-themes';
import { useState } from 'react';
import DailyGoalSheet from '@/components/english/goals/DailyGoalSheet';
import type { ShellGoals } from '@/components/english/goals/RewardCenter';

export default function AccountMenu({ name, goals, admin }: { name: string; goals: ShellGoals; admin: boolean }) {
 const { theme, setTheme } = useTheme();
 const [goalOpen, setGoalOpen] = useState(false);
 const [error, setError] = useState('');
 return <>
  <details className="relative">
   <summary aria-label="Menu tài khoản" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-surface font-bold text-accent focus-visible:ring-2 focus-visible:ring-accent">{name.trim().charAt(0).toUpperCase() || 'A'}</summary>
   <div className="absolute right-0 z-50 mt-2 w-60 rounded-panel border border-border bg-surface p-3 text-sm shadow-overlay md:bottom-full md:left-0 md:right-auto md:mb-2">
    <p className="truncate px-2 py-2 font-bold">{name}</p>
    <button type="button" onClick={() => setGoalOpen(true)} className="min-h-11 w-full rounded-control px-2 text-left hover:bg-surface-hover">Mục tiêu ngày</button>
    <label className="block px-2 py-2">Giao diện<select aria-label="Giao diện" value={theme || 'system'} onChange={(event) => setTheme(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-background px-2"><option value="light">Sáng</option><option value="dark">Tối</option><option value="system">Tự động</option></select></label>
    {admin && <Link href="/admin" className="flex min-h-11 items-center px-2">Quản trị</Link>}
    <button type="button" onClick={() => void signOut({ redirectTo: '/login' }).catch(() => setError('Không thể đăng xuất. Hãy thử lại.'))} className="min-h-11 w-full rounded-control px-2 text-left hover:bg-surface-hover">Đăng xuất</button>
    {error && <p role="alert" className="text-error">{error}</p>}
   </div>
  </details>
  <DailyGoalSheet open={goalOpen} current={goals.dailyGoalXp} todayGoal={goals.goal} onClose={() => setGoalOpen(false)} />
 </>;
}
