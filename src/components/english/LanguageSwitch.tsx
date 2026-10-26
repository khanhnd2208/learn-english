'use client';

import Link from 'next/link';

export default function LanguageSwitch() {
	const chineseUrl = process.env.NEXT_PUBLIC_CHINESE_URL;
	if (!chineseUrl) return null;

	return (
		<div className="inline-flex rounded-pill border border-border bg-surface p-1" aria-label="Chọn ngôn ngữ">
			<a
				href={chineseUrl}
				className="rounded-pill px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
			>
				Tiếng Trung
			</a>
			<Link
				href="/"
				aria-current="page"
				className="rounded-pill px-3 py-1 text-xs font-bold bg-accent text-accent-foreground"
			>
				Tiếng Anh
			</Link>
		</div>
	);
}
