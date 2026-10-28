import { expect, it } from 'vitest';
import { toSenseBundle, clozeOf } from '@/lib/english/senseBundle';
import { bundle } from './fixtures/bundle';
it('maps only published examples including their role', () => { const b = bundle(1); const result = toSenseBundle({ ...b.sense, word: b.word, examples: [{ ...b.examples[0]!, status: 'published' }, { ...b.examples[0]!, id: 'draft', status: 'draft' }] }); expect(result.examples).toHaveLength(1); expect(result.examples[0]!.role).toBe('grade'); expect(clozeOf(result.examples[0]!)).toEqual({ before: 'Use ', answer: 'word1', after: ' here.' }); });
