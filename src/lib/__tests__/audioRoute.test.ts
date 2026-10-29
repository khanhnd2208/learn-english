import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn() }));
vi.mock('@/lib/apiAuth', () => ({ getApiUser: mocks.auth }));
vi.mock('@/services/english/enAudioService', () => ({ readEnglishAudio: mocks.read }));
import { GET } from '@/app/api/audio/route';

const dir = mkdtempSync(join(tmpdir(), 'audio-route-'));
const file = join(dir, 'sample.ogg');
beforeAll(() => {
	writeFileSync(file, Buffer.from([1, 2, 3, 4]));
	mocks.auth.mockResolvedValue({ id: 'u', role: 'student' });
	mocks.read.mockResolvedValue({ file, size: 4, type: 'audio/ogg', etag: '"sample-4"' });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

it('streams only a requested byte range with an ETag', async () => {
	const req = new NextRequest('http://localhost/api/audio?senseId=s', { headers: { Range: 'bytes=1-2' } });
	const response = await GET(req);
	expect(response.status).toBe(206);
	expect(response.headers.get('content-range')).toBe('bytes 1-2/4');
	expect(response.headers.get('etag')).toBe('"sample-4"');
	expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([2, 3]);
});

it('returns 304 without opening the stream when ETag matches', async () => {
	const response = await GET(new NextRequest('http://localhost/api/audio?senseId=s', { headers: { 'If-None-Match': '"sample-4"' } }));
	expect(response.status).toBe(304);
	expect(await response.text()).toBe('');
});
