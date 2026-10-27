import { describe, expect, it } from 'vitest';
import { classifyPlayError } from '@/lib/english/audioPlayback';

describe('classifyPlayError', () => {
	it('treats an autoplay block as blocked, not broken', () => {
		expect(classifyPlayError(new DOMException('no gesture', 'NotAllowedError'))).toBe('blocked');
		expect(classifyPlayError({ name: 'NotAllowedError' })).toBe('blocked');
	});

	it('treats every other rejection as a broken source', () => {
		expect(classifyPlayError(new DOMException('bad file', 'NotSupportedError'))).toBe('broken');
		expect(classifyPlayError(new Error('network'))).toBe('broken');
		expect(classifyPlayError(undefined)).toBe('broken');
	});
});
