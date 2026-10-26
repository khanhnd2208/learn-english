import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import Providers from '@/components/Providers';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

/* eslint-disable @next/next/no-page-custom-font */

const sans = Source_Sans_3({
	variable: '--font-sans',
	subsets: ['latin', 'vietnamese'],
	weight: ['400', '600', '700', '800', '900'],
});

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	viewportFit: 'cover',
	themeColor: '#1d4ed8',
};

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3002'),
	title: 'Học Tiếng Anh — Vocabulary Mastery',
	description: 'Học từ vựng Tiếng Anh theo ngữ cảnh & phản xạ',
	applicationName: 'Học Tiếng Anh',
	appleWebApp: {
		capable: true,
		title: 'Tiếng Anh',
		statusBarStyle: 'default',
	},
	manifest: '/manifest.webmanifest',
	icons: {
		icon: '/app-icon.png',
		apple: '/app-icon-192.png',
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="vi" suppressHydrationWarning>
			<head>
				<link
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className={`${sans.variable} antialiased selection:bg-accent-subtle selection:text-accent`}>
				<Providers>
					<PwaRegister />
					{children}
				</Providers>
			</body>
		</html>
	);
}
