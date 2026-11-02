import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { getExamForLearner } from '@/services/english/enExamService';
import ExamRunner from '@/components/english/exam/ExamRunner';

export const dynamic = 'force-dynamic';
export default async function ExamPage({ params }: { params: Promise<{ courseId: string; examId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { courseId, examId } = await params;
  let initial;
  try { initial = await getExamForLearner(session.user.id, examId, session.user.role === 'admin'); }
  catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    if (error instanceof AppError && error.status === 403) redirect(`/courses/${courseId}?tab=kiem-tra`);
    throw error;
  }
  if (initial.exam.courseId !== courseId) notFound();
  return <ExamRunner initial={initial} />;
}
