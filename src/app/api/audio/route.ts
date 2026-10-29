import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import { parseByteRange } from '@/lib/english/audioPath';
import { readEnglishAudio } from '@/services/english/enAudioService';

export const GET = withAuth(async (request, user) => {
	const params = request.nextUrl.searchParams;
	const format = z.enum(['opus', 'mp3']).optional().safeParse(params.get('format') ?? undefined);
	if (!format.success) return NextResponse.json({ ok: false, error: 'Định dạng audio không hợp lệ' }, { status: 400 });
	const file = await readEnglishAudio({
		format: format.data,
		senseId: params.get('senseId'),
		exampleId: params.get('exampleId'),
	}, { userId: user.id, admin: user.role === 'admin' });
	if (request.headers.get('if-none-match') === file.etag) return new NextResponse(null, { status: 304, headers: { ETag: file.etag, 'Cache-Control': 'private, max-age=86400' } });
	const rangeHeader = request.headers.get('range');
	const range = parseByteRange(rangeHeader, file.size);
	const headers = new Headers({
		'Content-Type': file.type,
		'Cache-Control': 'private, max-age=86400',
		'ETag': file.etag,
		'Accept-Ranges': 'bytes',
		'Content-Length': String(range ? range.end - range.start + 1 : file.size),
	});
	if (rangeHeader && !range) {
		headers.set('Content-Range', `bytes */${file.size}`);
		return new NextResponse(null, { status: 416, headers });
	}
	if (range) {
		headers.set('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
		return new NextResponse(Readable.toWeb(createReadStream(file.file, { start: range.start, end: range.end })) as ReadableStream, { status: 206, headers });
	}
	return new NextResponse(Readable.toWeb(createReadStream(file.file)) as ReadableStream, { headers });
});
