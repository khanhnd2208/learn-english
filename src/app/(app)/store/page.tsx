import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';
import Library from '@/components/english/Library';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const isAdmin = session.user.role === 'admin';
	const sets = await listEnglishSets(session.user.id, isAdmin, { storeOnly: !isAdmin });
	return <Library sets={sets} isAdmin={isAdmin} />;
}
