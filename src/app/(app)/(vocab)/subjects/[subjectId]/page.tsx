import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { getVocabSubjectDetail } from '@/services/english/enVocabSubjectService';
import SubjectDetail from '@/components/english/SubjectDetail';

export const dynamic = 'force-dynamic';
export default async function SubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { subjectId } = await params;
  let detail;
  try { detail = await getVocabSubjectDetail(session.user.id, subjectId, session.user.role === 'admin'); }
  catch (error) { if (error instanceof AppError && error.status === 404) notFound(); throw error; }
  return <SubjectDetail detail={detail} isAdmin={session.user.role === 'admin'} />;
}
