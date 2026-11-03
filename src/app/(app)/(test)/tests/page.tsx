import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listTestSubjects } from '@/services/english/enTestSubjectService';
import TestLibrary from '@/components/english/tests/TestLibrary';

export const dynamic = 'force-dynamic';

export default async function TestsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const isAdmin = session.user.role === 'admin';
	const subjects = await listTestSubjects(session.user.id, isAdmin);
	return <TestLibrary subjects={subjects} isAdmin={isAdmin} />;
}
