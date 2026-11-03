import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { getTestPaperForLearner, paperSubjectId } from '@/services/english/enTestService';
import TestRunner from '@/components/english/tests/TestRunner';

export const dynamic = 'force-dynamic';
export default async function TestPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { paperId } = await params;
  let initial;
  try { initial = await getTestPaperForLearner(session.user.id, paperId, session.user.role === 'admin'); }
  catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    if (error instanceof AppError && error.status === 403) {
      const subjectId = await paperSubjectId(paperId);
      redirect(subjectId ? `/tests/subjects/${subjectId}` : '/tests');
    }
    throw error;
  }
  return <TestRunner initial={initial} />;
}
