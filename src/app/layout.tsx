import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Handjet, VT323 } from 'next/font/google';
import Providers from '@/components/Providers';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

/* Material Symbols use block to prevent ligature text flashing before the icon font loads. */
/* eslint-disable @next/next/no-page-custom-font, @next/next/google-font-display */

const sans = Be_Vietnam_Pro({
	variable: '--font-sans',
	subsets: ['latin', 'vietnamese'],
	weight: ['400', '600', '700', '800', '900'],
});
const pixel = Handjet({ variable: '--font-pixel', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700', '800'] });
const pixelFallback = VT323({ variable: '--font-pixel-fallback', subsets: ['latin', 'vietnamese'], weight: '400' });

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	viewportFit: 'cover',
	themeColor: '#fbf2e8',
};

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3002'),
	title: 'WordQuest — Học tiếng Anh',
	description: 'Học từ vựng Tiếng Anh theo ngữ cảnh & phản xạ',
	applicationName: 'WordQuest',
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
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block"
					rel="stylesheet"
				/>
			</head>
			<body className={`${sans.variable} ${pixel.variable} ${pixelFallback.variable} antialiased selection:bg-accent-subtle selection:text-accent`}>
				<Providers>
					<PwaRegister />
					{children}
				</Providers>
			</body>
		</html>
	);
}
