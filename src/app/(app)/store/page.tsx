import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listVocabSubjects } from '@/services/english/enVocabSubjectService';
import Library from '@/components/english/Library';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const isAdmin = session.user.role === 'admin';
	const subjects = await listVocabSubjects(session.user.id, isAdmin);
	return <Library subjects={subjects} isAdmin={isAdmin} />;
}
