import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTodayOverview } from '@/services/english/enDailyService';
import ReviewOverview from '@/components/english/ReviewOverview';
export const dynamic = 'force-dynamic';
export default async function ReviewPage() { const session = await auth(); if (!session?.user) redirect('/login'); const overview = await getTodayOverview(session.user.id); return <ReviewOverview overview={overview} />; }
