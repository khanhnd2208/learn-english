import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import { parseByteRange } from '@/lib/english/audioPath';
import { readEnglishAudio } from '@/services/english/enAudioService';

export const GET = withAuth(async (request, user) => {
	const params = request.nextUrl.searchParams;
	const file = await readEnglishAudio({
		senseId: params.get('senseId'),
		exampleId: params.get('exampleId'),
	}, { userId: user.id, admin: user.role === 'admin' });
	const rangeHeader = request.headers.get('range');
	const range = parseByteRange(rangeHeader, file.bytes.length);
	const headers = new Headers({
		'Content-Type': file.type,
		'Cache-Control': 'private, max-age=3600',
		'Accept-Ranges': 'bytes',
		'Content-Length': String(range ? range.end - range.start + 1 : file.bytes.length),
	});
	if (rangeHeader && !range) {
		headers.set('Content-Range', `bytes */${file.bytes.length}`);
		return new NextResponse(null, { status: 416, headers });
	}
	if (range) {
		headers.set('Content-Range', `bytes ${range.start}-${range.end}/${file.bytes.length}`);
		return new NextResponse(new Uint8Array(file.bytes.subarray(range.start, range.end + 1)), { status: 206, headers });
	}
	return new NextResponse(new Uint8Array(file.bytes), { headers });
});
