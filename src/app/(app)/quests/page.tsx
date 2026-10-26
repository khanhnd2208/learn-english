import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';
import QuestBoard from '@/components/english/QuestBoard';

export const dynamic = 'force-dynamic';
export default async function QuestsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const sets = await listEnglishSets(session.user.id, session.user.role === 'admin');
	return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8"><header><p className="label-caps">Tự lái hành trình</p><h1 className="text-3xl font-black">Nhiệm vụ</h1><p className="mt-2 text-sm text-muted">Tiến độ giúp bạn chia mục tiêu thành bước nhỏ. Hoàn thành nhiệm vụ không cộng XP.</p></header><QuestBoard sets={sets.filter((set) => set.enrolled).map(({ id, title }) => ({ id, title }))} /></div>;
}
