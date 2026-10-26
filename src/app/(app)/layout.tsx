import { redirect } from 'next/navigation';
import EnglishShell from '@/components/english/EnglishShell';
import { auth } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	return <EnglishShell>{children}</EnglishShell>;
}
