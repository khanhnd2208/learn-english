import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { getTestSubjectDetail } from '@/services/english/enTestSubjectService';
import TestSubjectDetail from '@/components/english/tests/TestSubjectDetail';

export const dynamic = 'force-dynamic';
export default async function TestSubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { subjectId } = await params;
  let detail;
  try { detail = await getTestSubjectDetail(session.user.id, subjectId, session.user.role === 'admin'); }
  catch (error) { if (error instanceof AppError && error.status === 404) notFound(); throw error; }
  return <TestSubjectDetail detail={detail} isAdmin={session.user.role === 'admin'} />;
}
