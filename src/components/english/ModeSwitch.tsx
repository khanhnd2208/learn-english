'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { modeOfPath, type AppMode } from '@/lib/appMode';

const base = 'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const storageKey = (mode: AppMode) => `wq_last_${mode}`;

/** Remembers the last page of each area so switching areas returns to it. */
export function rememberPath(pathname: string) {
	try { window.localStorage.setItem(storageKey(modeOfPath(pathname)), pathname); } catch { /* storage unavailable */ }
}

function lastPath(mode: AppMode): string | null {
	try {
		const stored = window.localStorage.getItem(storageKey(mode));
		return stored && stored.startsWith('/') && modeOfPath(stored) === mode ? stored : null;
	} catch { return null; }
}

export default function ModeSwitch() {
	const router = useRouter();
	const mode = modeOfPath(usePathname());
	const options: { mode: AppMode; label: string; href: string }[] = [
		{ mode: 'vocab', label: 'Từ vựng', href: '/?mode=vocab' },
		{ mode: 'test', label: 'Kiểm tra', href: '/tests' },
	];
	return (
		<div role="group" aria-label="Khu vực" className="inline-flex rounded-full border border-border bg-surface p-0.5">
			{options.map((option) => (
				<Link
					key={option.mode}
					href={option.href}
					aria-current={mode === option.mode ? 'page' : undefined}
					onClick={(event) => {
						if (mode === option.mode) return;
						const stored = lastPath(option.mode);
						if (stored) { event.preventDefault(); router.push(stored); }
					}}
					className={`${base} ${mode === option.mode ? 'bg-accent-subtle text-accent' : 'text-muted hover:text-foreground'}`}
				>{option.label}</Link>
			))}
		</div>
	);
}
