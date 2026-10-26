import { notFound, redirect } from 'next/navigation';
import PracticeRunner, { type PracticeKind } from '@/components/english/quiz/PracticeRunner';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { isQuizKind } from '@/lib/english/quiz';
import { getEnglishSetDetail } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function SetPracticePage({ params, searchParams }: { params: Promise<{ setId: string }>; searchParams: Promise<{ type?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const { setId } = await params;
	const { type } = await searchParams;
	if (type !== 'mix' && !isQuizKind(type ?? '')) notFound();
	let detail;
	try {
		detail = await getEnglishSetDetail(session.user.id, setId, session.user.role === 'admin');
	} catch (error) {
		if (error instanceof AppError && error.status === 404) notFound();
		throw error;
	}
	if (!detail.enrolled) redirect(`/sets/${setId}`);
	return <PracticeRunner detail={detail} kind={type as PracticeKind} />;
}
