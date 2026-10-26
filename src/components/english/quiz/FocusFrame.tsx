'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/** Full-screen frame for practice and test runs: exit button, title, segmented progress. */
export default function FocusFrame({ title, subtitle, progress, total, children, dirty = false, exitHref = '/' }: {
	title: string;
	subtitle: string;
	progress: number;
	total: number;
	children: ReactNode;
	dirty?: boolean;
	exitHref?: string;
}) {
	const router = useRouter();

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [dirty]);

	function leave() {
		if (!dirty || window.confirm('Thoát bài đang làm? Câu trả lời của bài kiểm tra đã được lưu, bạn có thể làm tiếp sau.')) router.push(exitHref);
	}

	return <div className="fixed inset-0 z-[90] overflow-y-auto bg-background">
		<div className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-2">
			<div className="mx-auto flex max-w-3xl items-center gap-3">
				<button type="button" onClick={leave} className="min-h-11 rounded-control px-3 font-bold focus-visible:ring-2 focus-visible:ring-accent">✕ Thoát</button>
				<div className="min-w-0 flex-1">
					<p className="truncate font-bold">{title}</p>
					<p className="text-xs text-muted">{subtitle}</p>
				</div>
				<p className="font-bold tabular-nums">{Math.min(progress, total)}/{total}</p>
			</div>
			<div className="segment-progress mx-auto mt-2 max-w-3xl" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(progress, total)}>
				{Array.from({ length: total }, (_, index) => <span key={index} data-done={index < progress} />)}
			</div>
		</div>
		<main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
	</div>;
}
