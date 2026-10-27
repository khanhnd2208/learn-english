import { describe, expect, it } from 'vitest';
import { parseByteRange } from '@/lib/english/audioPath';

describe('parseByteRange', () => {
	it('parses an open-ended range', () => {
		expect(parseByteRange('bytes=0-', 1000)).toEqual({ start: 0, end: 999 });
	});

	it('parses a bounded range', () => {
		expect(parseByteRange('bytes=0-1', 1000)).toEqual({ start: 0, end: 1 });
	});

	it('parses a suffix range', () => {
		expect(parseByteRange('bytes=-500', 1000)).toEqual({ start: 500, end: 999 });
	});

	it('clamps an end beyond the file and rejects a start beyond it', () => {
		expect(parseByteRange('bytes=900-9999', 1000)).toEqual({ start: 900, end: 999 });
		expect(parseByteRange('bytes=1000-', 1000)).toBeNull();
	});

	it('rejects malformed and multi-range headers', () => {
		expect(parseByteRange('garbage', 1000)).toBeNull();
		expect(parseByteRange('bytes=1-2,4-5', 1000)).toBeNull();
		expect(parseByteRange(null, 1000)).toBeNull();
	});
});
