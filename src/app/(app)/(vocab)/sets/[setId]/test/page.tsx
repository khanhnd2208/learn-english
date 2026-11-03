import { redirect } from 'next/navigation';
import { isQuizKind } from '@/lib/english/quiz';

export default async function SetTestPage({ params, searchParams }: { params: Promise<{ setId: string }>; searchParams: Promise<{ type?: string }> }) {
 const [{ setId }, { type }] = await Promise.all([params, searchParams]);
 redirect(`/sets/${encodeURIComponent(setId)}/practice?type=${isQuizKind(type ?? '') ? type : 'mcq'}`);
}
