import TestShell from '@/components/english/tests/TestShell';
import { auth } from '@/lib/auth';
import { getAvatarState } from '@/services/english/enAvatarService';

export default async function TestLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	const user = session!.user!;
	const avatar = await getAvatarState(user.id, user.image);
	return <TestShell avatarUrl={avatar.avatarUrl} hasUpload={avatar.hasUpload}>{children}</TestShell>;
}
