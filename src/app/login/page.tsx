import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { auth } from '@/lib/auth';
import InAppBrowserNotice from './in-app-browser-notice';
import SignInWithGoogleButton from './sign-in-with-google-button';

export default async function LoginPage() {
	const session = await auth();
	if (session?.user) redirect('/');

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-background px-6">
			<Card className="w-full max-w-md p-8">
				<CardContent className="p-0">
					<div className="flex items-center gap-3">
						<Image
							src="/app-icon.png"
							alt="WordQuest"
							width={48}
							height={48}
							className="rounded-xl border border-border"
						/>
						<div>
							<p className="label-caps">Học tiếng Anh mỗi ngày</p>
							<h1 className="text-2xl font-black text-foreground">
								WordQuest
							</h1>
						</div>
					</div>
					<p className="mt-4 text-sm text-foreground-secondary">
						Ghi nhớ từ vựng theo nhịp của bạn, mỗi ngày một chút.
					</p>
					<ul className="mt-5 grid gap-2 text-sm font-bold"><li>◆ Ôn đúng lúc</li><li>◆ Luyện theo ngữ cảnh</li><li>◆ Theo dõi tiến bộ</li></ul><div className="mt-8">
						<InAppBrowserNotice />
						<SignInWithGoogleButton callbackUrl="/" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
