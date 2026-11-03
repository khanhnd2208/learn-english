import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listAdminTestSubjects } from '@/services/english/enTestSubjectService';
import CourseBoard from '@/components/english/tests/CourseBoard';

export const dynamic = 'force-dynamic';

export default async function TestAdminPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	if (session.user.role !== 'admin') redirect('/tests');
	return <CourseBoard subjects={await listAdminTestSubjects()} />;
}
