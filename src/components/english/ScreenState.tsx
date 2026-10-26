'use client';

import Link from 'next/link';

export function ErrorState({ retry }: { retry: () => void }) {
	return <section role="alert" className="mx-auto mt-10 max-w-xl rounded-panel border border-border bg-surface p-6 text-center">
		<h1 className="text-3xl">Không tải được trang</h1>
		<p className="mt-2 text-sm text-muted">Kết nối có thể bị gián đoạn. Hãy thử lại.</p>
		<div className="mt-5 flex justify-center gap-3">
			<button type="button" onClick={retry} className="min-h-11 rounded-control bg-accent px-5 font-bold text-accent-foreground">Thử lại</button>
			<Link href="/" className="inline-flex min-h-11 items-center rounded-control border border-border px-5 font-bold">Tổng quan</Link>
		</div>
	</section>;
}

export function ScreenSkeleton() {
	return <div className="mx-auto max-w-5xl space-y-5 px-4 py-8" aria-busy="true" aria-label="Đang tải">
		<div className="h-12 w-2/3 animate-pulse rounded-control bg-surface-container" />
		<div className="h-52 animate-pulse rounded-panel bg-surface-container" />
		<div className="grid gap-4 md:grid-cols-2">
			<div className="h-44 animate-pulse rounded-panel bg-surface-container" />
			<div className="h-44 animate-pulse rounded-panel bg-surface-container" />
		</div>
	</div>;
}
