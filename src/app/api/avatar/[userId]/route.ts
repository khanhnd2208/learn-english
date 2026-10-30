import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import { readAvatar } from '@/services/english/enAvatarService';

const CACHE_CONTROL = 'private, max-age=31536000, immutable';

export const GET = withAuth(async (request, _user, { params }) => {
	const { userId } = await params;
	const avatar = await readAvatar(userId);
	if (request.headers.get('if-none-match') === avatar.etag) {
		return new NextResponse(null, { status: 304, headers: { ETag: avatar.etag, 'Cache-Control': CACHE_CONTROL } });
	}
	return new NextResponse(Readable.toWeb(createReadStream(avatar.file)) as ReadableStream, {
		headers: {
			'Content-Type': 'image/webp',
			'Content-Length': String(avatar.size),
			'ETag': avatar.etag,
			'Cache-Control': CACHE_CONTROL,
		},
	});
});
