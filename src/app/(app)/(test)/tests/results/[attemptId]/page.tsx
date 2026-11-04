import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { getTestResult } from '@/services/english/enTestService';
import TestResultView from '@/components/english/tests/TestResultView';
import BackLink from '@/components/ui/BackLink';

export const dynamic = 'force-dynamic';
export default async function TestResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { attemptId } = await params;
  let result;
  try { result = await getTestResult(session.user.id, attemptId); }
  catch (error) { if (error instanceof AppError && error.status === 404) notFound(); throw error; }
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <BackLink href="/tests/results">Kết quả</BackLink>
    <p className="text-sm text-muted">{result.paperTitle} · {result.subjectTitle} · {result.day}</p>
    <TestResultView result={result} />
  </div>;
}
