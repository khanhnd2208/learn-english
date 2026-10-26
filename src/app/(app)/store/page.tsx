import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';
import EnrollButton from '@/components/english/EnrollButton';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const sets = await listEnglishSets(session.user.id, false);
	return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
		<header><h1 className="text-4xl sm:text-5xl">Cửa hàng</h1><p className="mt-2 text-sm text-muted">Chọn bộ từ để tải về. Tiến độ học của bạn được lưu khi gỡ bộ.</p></header>
		{sets.length === 0 ? <EmptyState icon="library_books" title="Chưa có bộ từ" description="Các bộ từ sẽ xuất hiện ở đây khi được xuất bản." /> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sets.map((set) => <li key={set.id} className="flex flex-col rounded-panel border border-border bg-surface p-5">
			<div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black">{set.title}</h2><span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold">{set.words} từ</span></div>
			{set.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{set.description}</p>}
			<div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
				<Link href={`/sets/${set.id}`} className="inline-flex min-h-11 items-center font-bold text-accent">{set.enrolled ? 'Mở bộ →' : 'Xem trước →'}</Link>
				{set.enrolled ? <span className="text-sm font-bold text-success">Đã tải ✓</span> : <EnrollButton setId={set.id} enrolled={false} />}
			</div>
		</li>)}</ul>}
	</div>;
}
