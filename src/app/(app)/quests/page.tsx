import { redirect } from 'next/navigation';

/** Quests now live in the progress hub; old links keep working. */
export default async function QuestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const { tab } = await searchParams;
	redirect(tab === 'achievements' ? '/progress?tab=achievements' : '/progress?tab=quests');
}
