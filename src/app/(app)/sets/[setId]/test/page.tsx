import { notFound, redirect } from 'next/navigation';
import TestRunner from '@/components/english/quiz/TestRunner';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { isQuizKind, type QuizKind } from '@/lib/english/quiz';
import { getEnglishSetDetail } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function SetTestPage({ params, searchParams }: { params: Promise<{ setId: string }>; searchParams: Promise<{ type?: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const { setId } = await params;
	const { type } = await searchParams;
	if (!isQuizKind(type ?? '')) notFound();
	let detail;
	try {
		detail = await getEnglishSetDetail(session.user.id, setId, session.user.role === 'admin');
	} catch (error) {
		if (error instanceof AppError && error.status === 404) notFound();
		throw error;
	}
	if (!detail.enrolled) redirect(`/sets/${setId}`);
	return <TestRunner detail={detail} kind={type as QuizKind} />;
}
