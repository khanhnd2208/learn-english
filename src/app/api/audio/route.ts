import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import { readEnglishAudio } from '@/services/english/enAudioService';

export const GET = withAuth(async (request) => {
	const params = request.nextUrl.searchParams;
	const file = await readEnglishAudio({
		questionId: params.get('questionId'),
		senseId: params.get('senseId'),
		exampleId: params.get('exampleId'),
		patternExampleId: params.get('patternExampleId'),
	});
	return new NextResponse(new Uint8Array(file.bytes), {
		headers: {
			'Content-Type': file.type,
			'Cache-Control': 'private, max-age=3600',
		},
	});
});
