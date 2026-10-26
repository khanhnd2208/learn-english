import Link from 'next/link';
import { redirect } from 'next/navigation';
import EnglishMistakeBook from '@/components/english/EnglishMistakeBook';
import EmptyState from '@/components/ui/EmptyState';
import { auth } from '@/lib/auth';
import { getEnglishBlueprint, listEnglishActivities } from '@/services/english/enActivityService';
import { listMistakeBook } from '@/services/english/enPracticeService';

export const dynamic = 'force-dynamic';

export default async function EnglishMistakesPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [words, activities, blueprint] = await Promise.all([
		listMistakeBook(session.user.id),
		listEnglishActivities(),
		getEnglishBlueprint(),
	]);
	if (words.length === 0) {
		return (
			<div className="mx-auto max-w-xl px-4 py-16">
				<EmptyState icon="menu_book" title="Sổ từ sai đang trống" description="Từ chưa đạt trong bài kiểm tra sẽ xuất hiện ở đây." action={{ label: 'Bộ từ', href: '/' }} />
			</div>
		);
	}
	return (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
			<header>
				<h1 className="text-3xl font-black text-foreground">Sổ từ sai</h1>
				<p className="mt-2 text-sm text-muted">{words.length} từ</p>
			</header>
			<EnglishMistakeBook words={words} activities={activities} maxWords={blueprint.maxWords} />
			<Link href="/" className="text-sm font-bold text-accent">Về bộ từ</Link>
		</div>
	);
}
