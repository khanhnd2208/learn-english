import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listCourses } from '@/services/english/enCourseService';
import Library from '@/components/english/Library';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const isAdmin = session.user.role === 'admin';
	const courses = await listCourses(session.user.id, isAdmin);
	return <Library courses={courses} isAdmin={isAdmin} />;
}
