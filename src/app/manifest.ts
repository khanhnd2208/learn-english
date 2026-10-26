import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Học Tiếng Anh',
		short_name: 'Tiếng Anh',
		description: 'Học từ vựng Tiếng Anh theo ngữ cảnh & phản xạ',
		start_url: '/',
		scope: '/',
		display: 'standalone',
		background_color: '#f7f4ef',
		theme_color: '#1d4ed8',
		orientation: 'portrait',
		icons: [
			{
				src: '/app-icon-192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'maskable',
			},
			{
				src: '/app-icon-512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable',
			},
		],
	};
}
