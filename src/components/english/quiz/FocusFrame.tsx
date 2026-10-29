'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ConfirmExitDialog from '@/components/english/ConfirmExitDialog';
import SessionHeader from '@/components/english/session/SessionHeader';
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
	const [confirmExit, setConfirmExit] = useState(false);

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [dirty]);

	function leave() {
		if (dirty) setConfirmExit(true);
		else router.push(exitHref);
	}

	return <div className="fixed inset-0 z-[90] overflow-y-auto bg-background">
		<SessionHeader label={subtitle} progress={progress} total={total} onExit={leave} />
		<div className="mx-auto flex max-w-2xl items-baseline justify-between gap-2 px-4 pt-2.5 sm:pt-4"><p className="truncate text-sm font-bold sm:text-base">{title}</p><p className="shrink-0 text-xs text-muted">{subtitle}</p></div>
		<main className="mx-auto max-w-2xl px-4 py-3 sm:py-6">{children}</main>
		<ConfirmExitDialog open={confirmExit} title="Thoát phiên học?" description={subtitle.startsWith('Luyện tập') ? 'Tiến trình luyện tập trong phiên này sẽ không được lưu.' : 'Các câu đã trả lời được lưu; bạn có thể tiếp tục sau.'} onStay={() => setConfirmExit(false)} onLeave={() => router.push(exitHref)} />
	</div>;
}
