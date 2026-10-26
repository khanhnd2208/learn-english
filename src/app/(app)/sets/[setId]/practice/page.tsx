import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getEnglishSetDetail } from '@/services/english/enCatalogService';
import { isQuizKind } from '@/lib/english/quiz';
import PracticeRunner from '@/components/english/quiz/PracticeRunner';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ setId: string }>; searchParams: Promise<{ type?: string }> }) { const session = await auth(); if (!session?.user) redirect('/login'); const { setId } = await params; const { type } = await searchParams; if (type !== 'mix' && !isQuizKind(type ?? '')) notFound(); const detail = await getEnglishSetDetail(session.user.id, setId, session.user.role === 'admin'); if (!detail.enrolled) redirect(`/sets/${setId}`); return <PracticeRunner detail={detail} kind={type as 'mix' | 'mcq' | 'fill' | 'listen'} />; }
