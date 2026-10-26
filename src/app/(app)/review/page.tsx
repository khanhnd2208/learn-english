import { redirect } from 'next/navigation';
import EnglishTest from '@/components/english/EnglishTest';
import { auth } from '@/lib/auth';
import { countStudiedToday } from '@/services/english/enCatalogService';
import { getEnglishBlueprint } from '@/services/english/enActivityService';
import { countReviewEligible } from '@/services/english/enPracticeService';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function EnglishReviewPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [blueprint, studiedToday, eligible] = await Promise.all([
		getEnglishBlueprint(),
		countStudiedToday(session.user.id),
		countReviewEligible(session.user.id),
	]);
	if (eligible === 0) {
		return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState icon="history" title="Chưa có từ để tổng hợp" description="Luyện một bộ trước để tạo danh sách ôn tổng hợp." action={{ label: 'Chọn bộ từ', href: '/' }} /></div>;
	}
	return (
		<div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
			<h1 className="text-3xl font-black text-foreground">Tổng hợp</h1>
			<p className="text-sm text-muted">Một bài kiểm tra ngắn, ưu tiên từ trong Sổ từ sai và từ lâu chưa gặp.</p>
			<EnglishTest mode="review" wordCount={Math.min(eligible, blueprint.reviewWords)} studiedToday={studiedToday} />
		</div>
	);
}
