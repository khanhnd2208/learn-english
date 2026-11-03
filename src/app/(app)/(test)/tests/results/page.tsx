import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listMyTestResults } from '@/services/english/enTestService';
import TestResults from '@/components/english/tests/TestResults';

export const dynamic = 'force-dynamic';

export default async function TestResultsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	return <TestResults rows={await listMyTestResults(session.user.id)} />;
}
