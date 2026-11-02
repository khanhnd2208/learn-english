import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/appError';
import { getCourseDetail } from '@/services/english/enCourseService';
import CourseDetail from '@/components/english/CourseDetail';

export const dynamic = 'force-dynamic';
export default async function CoursePage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const [{ courseId }, { tab }] = await Promise.all([params, searchParams]);
  let detail;
  try { detail = await getCourseDetail(session.user.id, courseId, session.user.role === 'admin'); }
  catch (error) { if (error instanceof AppError && error.status === 404) notFound(); throw error; }
  return <CourseDetail detail={detail} isAdmin={session.user.role === 'admin'} initialTab={tab === 'kiem-tra' ? 'exams' : 'words'} />;
}
