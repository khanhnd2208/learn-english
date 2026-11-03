import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listMyTestPapers } from '@/services/english/enTestService';
import { listTestSubjects } from '@/services/english/enTestSubjectService';
import TestPaperList from '@/components/english/tests/TestPaperList';

export const dynamic = 'force-dynamic';

export default async function TestPapersPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const userId = session.user.id;
	const [papers, subjects] = await Promise.all([listMyTestPapers(userId), listTestSubjects(userId, false)]);
	return <TestPaperList papers={papers} hasCourses={subjects.some((subject) => subject.enrolled)} />;
}
