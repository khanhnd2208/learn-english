import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';
import EnrollButton from '@/components/english/EnrollButton';
import EmptyState from '@/components/ui/EmptyState';
import StoreAdminControls from '@/components/english/StoreAdminControls';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const isAdmin = session.user.role === 'admin';
	const sets = await listEnglishSets(session.user.id, isAdmin, { storeOnly: !isAdmin });
	return <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
		<header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl">Cửa hàng</h1><p className="mt-1 text-sm text-muted">{isAdmin ? 'Bạn đang xem với quyền admin — bộ nháp và bộ ẩn cũng hiện ở đây.' : 'Chọn bộ từ để tải về. Tiến độ học của bạn được lưu khi gỡ bộ.'}</p></div>{isAdmin && <Link href="/admin" className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground">+ Thêm bộ</Link>}</header>
		{sets.length === 0 ? <EmptyState icon="library_books" title="Chưa có bộ từ" description="Các bộ từ sẽ xuất hiện ở đây khi được xuất bản." /> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sets.map((set) => <li key={set.id} className="flex flex-col rounded-panel border border-border bg-surface p-4">
			<div className="flex items-start justify-between gap-3"><h2 className="text-base font-bold">{set.title}</h2><div className="flex flex-wrap justify-end gap-1"><span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold">{set.words} từ</span>{set.locked && <span className="shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">🔒 Cần mật khẩu</span>}</div></div>
			{set.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{set.description}</p>}
			<div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
				<Link href={`/sets/${set.id}`} className="inline-flex min-h-11 items-center font-bold text-accent">{set.enrolled ? 'Mở bộ →' : 'Xem trước →'}</Link>
				{set.enrolled ? <span className="text-sm font-bold text-success">Đã tải ✓</span> : <EnrollButton setId={set.id} enrolled={false} locked={set.locked} />}
			</div>
			{isAdmin && <StoreAdminControls setId={set.id} title={set.title} status={set.status} listed={set.listed ?? true} accessCode={set.accessCode ?? null} learners={set.learners ?? 0} />}
		</li>)}</ul>}
	</div>;
}
