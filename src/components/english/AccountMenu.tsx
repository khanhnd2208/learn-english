'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from '@teispace/next-themes';
import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import AvatarSheet from '@/components/english/AvatarSheet';
import DailyGoalSheet from '@/components/english/goals/DailyGoalSheet';
import type { ShellGoals } from '@/components/english/goals/RewardCenter';

export default function AccountMenu({ name, goals, admin, avatarUrl, hasUpload }: { name: string; goals: ShellGoals; admin: boolean; avatarUrl: string | null; hasUpload: boolean }) {
 const { theme, setTheme } = useTheme();
 const [goalOpen, setGoalOpen] = useState(false);
 const [avatarOpen, setAvatarOpen] = useState(false);
 const [error, setError] = useState('');
 const detailsRef = useRef<HTMLDetailsElement>(null);
 const closeMenu = () => { if (detailsRef.current) detailsRef.current.open = false; };

 useEffect(() => {
  const onPointerDown = (event: PointerEvent) => {
   if (detailsRef.current?.open && !detailsRef.current.contains(event.target as Node)) closeMenu();
  };
  const onKeyDown = (event: KeyboardEvent) => {
   if (event.key === 'Escape' && detailsRef.current?.open) closeMenu();
  };
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown);
  return () => {
   document.removeEventListener('pointerdown', onPointerDown);
   document.removeEventListener('keydown', onKeyDown);
  };
 }, []);

 return <>
  <details ref={detailsRef} className="relative">
   <summary aria-label="Menu tài khoản" className="flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-accent sm:min-h-11 sm:min-w-11"><Avatar src={avatarUrl} name={name} size="md" /></summary>
   <div className="absolute right-0 z-50 mt-2 w-60 rounded-panel border border-border bg-surface p-3 text-sm shadow-overlay md:bottom-full md:left-0 md:right-auto md:mb-2">
    <p className="truncate border-b border-border/60 px-2 pb-2 font-bold">{name}</p>
    <button type="button" onClick={() => { closeMenu(); setAvatarOpen(true); }} className="mt-1 min-h-11 w-full rounded-control px-2 text-left hover:bg-surface-hover">Đổi ảnh đại diện</button>
    <button type="button" onClick={() => { closeMenu(); setGoalOpen(true); }} className="min-h-11 w-full rounded-control px-2 text-left hover:bg-surface-hover">Mục tiêu ngày</button>
    <label className="block px-2 py-2">Giao diện<select aria-label="Giao diện" value={theme || 'system'} onChange={(event) => { setTheme(event.target.value); closeMenu(); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-background px-2"><option value="light">Sáng</option><option value="dark">Tối</option><option value="system">Tự động</option></select></label>
    {admin && <Link href="/admin" onClick={closeMenu} className="flex min-h-11 items-center rounded-control px-2 hover:bg-surface-hover">Quản trị</Link>}
    <button type="button" onClick={() => { closeMenu(); void signOut({ redirectTo: '/login' }).catch(() => setError('Không thể đăng xuất. Hãy thử lại.')); }} className="min-h-11 w-full rounded-control px-2 text-left text-error hover:bg-surface-hover">Đăng xuất</button>
    {error && <p role="alert" className="px-2 pt-1 text-xs text-error">{error}</p>}
   </div>
  </details>
  <AvatarSheet open={avatarOpen} onClose={() => setAvatarOpen(false)} name={name} avatarUrl={avatarUrl} hasUpload={hasUpload} />
  <DailyGoalSheet open={goalOpen} current={goals.dailyGoalXp} todayGoal={goals.goal} onClose={() => setGoalOpen(false)} />
 </>;
}
