import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listAdminTestSubjects } from '@/services/english/enTestSubjectService';
import PaperAdmin from '@/components/english/tests/PaperAdmin';

export const dynamic = 'force-dynamic';

export default async function TestPaperAdminPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	if (session.user.role !== 'admin') redirect('/tests');
	return <PaperAdmin subjects={await listAdminTestSubjects()} />;
}
