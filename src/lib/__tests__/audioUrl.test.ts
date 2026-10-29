import { expect, it, vi } from 'vitest';

it('adds mp3 only when the browser lacks Opus support', async () => {
	vi.stubGlobal('Audio', class { canPlayType() { return ''; } });
	vi.resetModules();
	let audio = await import('@/lib/englishAudio');
	expect(audio.senseAudioUrl('a b')).toBe('/api/audio?senseId=a%20b&format=mp3');
	expect(audio.exampleAudioUrl('x')).toBe('/api/audio?exampleId=x&format=mp3');
	vi.stubGlobal('Audio', class { canPlayType() { return 'probably'; } });
	vi.resetModules(); audio = await import('@/lib/englishAudio');
	expect(audio.senseAudioUrl('a b')).toBe('/api/audio?senseId=a%20b');
	vi.unstubAllGlobals();
});
