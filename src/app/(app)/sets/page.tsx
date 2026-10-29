import Link from 'next/link';
import { redirect } from 'next/navigation';
import EmptyState from '@/components/ui/EmptyState';
import StageBar from '@/components/english/StageBar';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function SetsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const sets = (await listEnglishSets(session.user.id, false)).filter((set) => set.enrolled);

	return <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-8">
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 className="text-2xl sm:text-3xl">Bộ từ của tôi</h1>
				<p className="mt-0.5 text-sm text-muted">{sets.length > 0 ? `${sets.length} bộ đang học` : 'Chọn bộ từ đầu tiên để bắt đầu học.'}</p>
			</div>
			{sets.length > 0 && <Link href="/store" className="inline-flex min-h-10 items-center justify-center rounded-control bg-accent px-3.5 text-sm font-bold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-11 sm:px-4">+ Thêm bộ</Link>}
		</header>
		{sets.length === 0 ? <EmptyState icon="library_books" title="Bạn chưa có bộ từ nào" description="Tìm một bộ phù hợp trong Thư viện rồi thêm vào để bắt đầu." action={{ label: 'Khám phá Thư viện', href: '/store' }} /> : <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
			{sets.map((set) => <li key={set.id} className="min-w-0">
				<Link href={`/sets/${set.id}`} className="group flex h-full flex-col rounded-panel border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-44 sm:p-5" aria-label={`Mở bộ ${set.title}, đã học ${set.learned} trên ${set.words} từ${set.dueToday > 0 ? `, ${set.dueToday} từ đến hạn` : ''}`}>
					<div className="flex items-start justify-between gap-3"><h2 className="min-w-0 text-base font-bold leading-snug group-hover:text-accent sm:text-lg">{set.title}</h2><span aria-hidden="true" className="shrink-0 text-lg text-accent sm:text-xl">→</span></div>
					{set.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{set.description}</p>}
					<div className="mt-auto pt-3.5 sm:pt-5">
						<div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs sm:text-sm"><span className="font-bold tabular-nums">{set.learned}/{set.words} từ đã học</span><span className={set.dueToday > 0 ? 'font-bold text-accent' : 'text-muted'}>{set.dueToday > 0 ? `${set.dueToday} đến hạn` : 'Chưa có từ đến hạn'}</span></div>
						<StageBar stages={set.stages} />
					</div>
				</Link>
			</li>)}
		</ul>}
	</div>;
}
