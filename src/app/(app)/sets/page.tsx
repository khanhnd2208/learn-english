import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import MaterialIcon from '@/components/ui/MaterialIcon';
import EnrollButton from '@/components/english/EnrollButton';

export const dynamic = 'force-dynamic';

export default async function EnglishSetsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const sets = await listEnglishSets(session.user.id, session.user.role === 'admin');
	const enrolled = sets.filter((set) => set.enrolled);
	const others = sets.filter((set) => !set.enrolled);

	const card = (set: (typeof sets)[number]) => {
		const learnedPct = set.words ? (set.learned / set.words) * 100 : 0;
		const longPct = set.words ? (set.longTerm / set.words) * 100 : 0;
		return <li key={set.id} className="flex flex-col rounded-panel border border-border bg-surface p-5 transition hover:border-accent/60">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black leading-tight">{set.title}</h2>{set.status === 'draft' && <Badge variant="warning">Nháp</Badge>}</div>
					{set.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{set.description}</p>}
				</div>
				<span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold tabular-nums text-foreground-secondary">{set.words} từ</span>
			</div>
			{set.enrolled && <div className="mt-4 space-y-2">
				<div className="relative h-2 overflow-hidden rounded-full bg-surface-container" role="img" aria-label={`${set.learned} đã học, ${set.longTerm} nhớ lâu trên ${set.words} từ`}>
					<div className="absolute inset-y-0 left-0 rounded-full bg-accent/35" style={{ width: `${learnedPct}%` }} />
					<div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: `${longPct}%` }} />
				</div>
				<p className="text-xs text-muted"><span className="font-bold text-foreground-secondary">{set.learned}</span>/{set.words} đã học · <span className="font-bold text-success">{set.longTerm}</span> nhớ lâu</p>
			</div>}
			{set.enrolled && <p className="mt-3 text-xs text-muted">Hôm nay: {Object.entries(set.dailyTasks).map(([kind, result]) => `✓ ${kind} ${result?.passedCount}/${result?.wordCount}`).join(' · ') || 'Chưa kiểm tra'}</p>}
			<div className="mt-auto flex items-center justify-between gap-3 pt-4">
				<Link href={`/sets/${set.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline">{set.enrolled ? 'Mở bộ' : 'Xem trước'} <MaterialIcon name="arrow_forward" size={16} /></Link>
				{set.status === 'published' && <EnrollButton setId={set.id} enrolled={set.enrolled} />}
			</div>
		</li>;
	};

	return <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
		<header><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Bộ từ</h1><p className="mt-1 text-sm text-muted">Chọn bộ từ để luyện tập hoặc làm bài kiểm tra. Tổng hợp sẽ ôn từ đến hạn từ mọi bộ.</p></header>
		{sets.length === 0 ? <EmptyState icon="library_books" title="Chưa có bộ từ" description="Admin cần nhập và xuất bản nội dung trước." /> : <>
			{enrolled.length > 0 && <section className="space-y-3"><h2 className="label-caps">Đang học · {enrolled.length}</h2><ul className="grid gap-3 md:grid-cols-2">{enrolled.map(card)}</ul></section>}
			{others.length > 0 && <section className="space-y-3"><h2 className="label-caps">{enrolled.length ? 'Thêm bộ khác' : 'Chọn bộ để bắt đầu'}</h2><ul className="grid gap-3 md:grid-cols-2">{others.map(card)}</ul></section>}
		</>}
	</div>;
}
