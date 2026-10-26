import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Button from '@/components/ui/Button';
import EnrollButton from '@/components/english/EnrollButton';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { countReviewEligible } from '@/services/english/enPracticeService';

export const dynamic = 'force-dynamic';

export default async function EnglishHomePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [sets, reviewEligible] = await Promise.all([
		listEnglishSets(session.user.id, session.user.role === 'admin'),
		countReviewEligible(session.user.id),
	]);
	if (sets.length === 0) {
		return (
			<div className="mx-auto max-w-xl px-4 py-16">
				<EmptyState icon="library_books" title="Chưa có bộ từ" description="Admin cần nhập và xuất bản nội dung trước." />
			</div>
		);
	}
	const learning = sets.filter((set) => set.enrolled);
	const others = sets.filter((set) => !set.enrolled);
	const mistakeCount = sets.reduce((total, set) => total + set.inMistakeBook, 0);
	const renderSet = (set: (typeof sets)[number]) => (
					<li key={set.id}>
						<Card interactive className="relative">
							<Link href={`/sets/${set.id}`} className="absolute inset-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Mở bộ ${set.title}`} />
							<CardContent className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="text-xl font-black text-foreground">{set.title}</h3>
										{set.status === 'draft' && <Badge variant="warning">Nháp</Badge>}
										{set.enrolled && <Badge variant={set.mastered === set.words && set.words > 0 ? 'success' : 'accent'}>{set.label}</Badge>}
									</div>
									{set.description && <p className="text-sm text-muted">{set.description}</p>}
									<p className="text-xs text-muted">{set.words} từ{set.inMistakeBook > 0 ? ` · ${set.inMistakeBook} trong Sổ` : ''}</p>
									{set.enrolled && <ProgressBar value={set.mastered} max={Math.max(1, set.words)} />}
								</div>
								{set.status === 'published' && !set.enrolled && <div className="relative z-10"><EnrollButton setId={set.id} enrolled={false} /></div>}
								{set.enrolled && <span className="relative z-10 text-sm font-bold text-accent">Tiếp tục →</span>}
							</CardContent>
						</Card>
					</li>
	);
	return (
		<div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
			<header><h1 className="text-3xl font-black text-foreground">Bộ từ</h1></header>
			<Card className="bg-surface-container">
				<CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
					<div>
						<p className="label-caps">Việc hôm nay</p>
						<Link href="/mistakes" className="mt-2 block text-lg font-black text-foreground">{mistakeCount > 0 ? `${mistakeCount} từ trong Sổ` : 'Sổ từ sai đang trống'}</Link>
					</div>
					{reviewEligible > 0 && <Link href="/review"><Button>Ôn tổng hợp · {reviewEligible} từ</Button></Link>}
				</CardContent>
			</Card>
			{learning.length > 0 && <section className="space-y-3"><h2 className="text-xl font-black">Đang học</h2><ul className="space-y-3">{learning.map(renderSet)}</ul></section>}
			{others.length > 0 && <section className="space-y-3"><h2 className="text-xl font-black">Bộ từ khác</h2><ul className="space-y-3">{others.map(renderSet)}</ul></section>}
		</div>
	);
}
