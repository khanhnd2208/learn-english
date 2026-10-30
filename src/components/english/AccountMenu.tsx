'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from '@teispace/next-themes';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Avatar from '@/components/ui/Avatar';
import MaterialIcon from '@/components/ui/MaterialIcon';
import AvatarSheet from '@/components/english/AvatarSheet';
import DailyGoalSheet from '@/components/english/goals/DailyGoalSheet';
import type { ShellGoals } from '@/components/english/goals/RewardCenter';

const THEMES = [
 { value: 'light', label: 'Sáng', icon: 'light_mode' },
 { value: 'dark', label: 'Tối', icon: 'dark_mode' },
 { value: 'system', label: 'Tự động', icon: 'contrast' },
] as const;

const item = 'flex min-h-11 w-full items-center gap-3 rounded-control px-2.5 text-left font-medium hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const subscribeNoop = () => () => {};

export default function AccountMenu({ name, goals, admin, avatarUrl, hasUpload }: { name: string; goals: ShellGoals; admin: boolean; avatarUrl: string | null; hasUpload: boolean }) {
 const { theme, setTheme } = useTheme();
 // The stored theme is only known in the browser; until then no option shows as chosen.
 const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
 const activeTheme = mounted ? theme || 'system' : null;
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
  <details ref={detailsRef} className="group relative">
   <summary aria-label="Menu tài khoản" className="flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-h-11 sm:min-w-11 md:w-full md:justify-start md:rounded-card md:p-1.5 md:hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
    <Avatar src={avatarUrl} name={name} size="md" />
    <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold md:block">{name}</span>
    <span className="hidden text-muted md:inline-flex"><MaterialIcon name="unfold_more" size={18} /></span>
   </summary>
   <div className="absolute right-0 z-50 mt-2 w-64 rounded-panel border border-border bg-surface p-1.5 text-sm shadow-overlay md:bottom-full md:left-0 md:right-auto md:mb-2 md:mt-0">
    <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
     <Avatar src={avatarUrl} name={name} size="sm" />
     <p className="min-w-0 flex-1 truncate font-semibold">{name}</p>
    </div>
    <div className="border-t border-border pt-1.5">
     <button type="button" onClick={() => { closeMenu(); setAvatarOpen(true); }} className={item}><MaterialIcon name="photo_camera" size={20} className="text-muted" />Đổi ảnh đại diện</button>
     <button type="button" onClick={() => { closeMenu(); setGoalOpen(true); }} className={item}><MaterialIcon name="flag" size={20} className="text-muted" />Mục tiêu ngày</button>
     {admin && <Link href="/admin" onClick={closeMenu} className={item}><MaterialIcon name="admin_panel_settings" size={20} className="text-muted" />Quản trị</Link>}
    </div>
    <div role="radiogroup" aria-label="Giao diện" className="mt-1.5 border-t border-border px-2.5 pt-2.5 pb-2">
     <p className="mb-2 text-xs font-semibold text-muted">Giao diện</p>
     <div className="grid grid-cols-3 gap-1 rounded-control bg-surface-container p-1">
      {THEMES.map((option) => {
       const active = activeTheme === option.value;
       return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => setTheme(option.value)} className={`flex min-h-9 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}><MaterialIcon name={option.icon} size={18} />{option.label}</button>;
      })}
     </div>
    </div>
    <div className="border-t border-border pt-1.5">
     <button type="button" onClick={() => { closeMenu(); void signOut({ redirectTo: '/login' }).catch(() => setError('Không thể đăng xuất. Hãy thử lại.')); }} className={`${item} text-error`}><MaterialIcon name="logout" size={20} />Đăng xuất</button>
     {error && <p role="alert" className="px-2.5 pt-1 pb-1 text-xs text-error">{error}</p>}
    </div>
   </div>
  </details>
  <AvatarSheet open={avatarOpen} onClose={() => setAvatarOpen(false)} name={name} avatarUrl={avatarUrl} hasUpload={hasUpload} />
  <DailyGoalSheet open={goalOpen} current={goals.dailyGoalXp} todayGoal={goals.goal} onClose={() => setGoalOpen(false)} />
 </>;
}
