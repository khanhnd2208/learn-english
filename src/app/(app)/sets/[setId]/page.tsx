import { notFound, redirect } from 'next/navigation';
import SetDetail from '@/components/english/SetDetail';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { getEnglishSetDetail } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function EnglishSetPage({ params }: { params: Promise<{ setId: string }> }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const { setId } = await params;
	let detail;
	try {
		detail = await getEnglishSetDetail(session.user.id, setId, session.user.role === 'admin');
	} catch (error) {
		if (error instanceof AppError && error.status === 404) notFound();
		throw error;
	}
	return <SetDetail detail={detail} isAdmin={session.user.role === 'admin'} />;
}
