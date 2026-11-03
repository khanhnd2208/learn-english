'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { modeOfPath } from '@/lib/appMode';

const base = 'inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold whitespace-nowrap';

export default function ModeSwitch() {
	const mode = modeOfPath(usePathname());
	return (
		<div role="group" aria-label="Chế độ" className="inline-flex rounded-full border border-border bg-surface p-0.5">
			<Link href="/?mode=vocab" aria-current={mode === 'vocab' ? 'page' : undefined} className={`${base} ${mode === 'vocab' ? 'bg-accent-subtle text-accent' : 'text-muted'}`}>Từ vựng</Link>
			<Link href="/tests" aria-current={mode === 'test' ? 'page' : undefined} className={`${base} ${mode === 'test' ? 'bg-accent-subtle text-accent' : 'text-muted'}`}>Kiểm tra</Link>
		</div>
	);
}
