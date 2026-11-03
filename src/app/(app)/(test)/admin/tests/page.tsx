import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listAdminTestSubjects } from '@/services/english/enTestSubjectService';
import TestAdmin from '@/components/english/tests/TestAdmin';

export const dynamic = 'force-dynamic';

export default async function TestAdminPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	if (session.user.role !== 'admin') redirect('/tests');
	return <TestAdmin subjects={await listAdminTestSubjects()} />;
}
