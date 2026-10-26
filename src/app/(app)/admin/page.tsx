import { redirect } from 'next/navigation';
import EnglishAdmin from '@/components/english/EnglishAdmin';
import { auth } from '@/lib/auth';
import { listEnglishAdminSets } from '@/services/english/enContentService';
import { englishQaToolsEnabled } from '@/services/english/enQaService';

export const dynamic = 'force-dynamic';

export default async function EnglishAdminPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	if (session.user.role !== 'admin') redirect('/');
	const sets = await listEnglishAdminSets();
	return <EnglishAdmin sets={sets} qaEnabled={englishQaToolsEnabled()} />;
}
