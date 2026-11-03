import { expect, it } from 'vitest';
import { accessCodeMatches } from '@/lib/accessCode';

it('ignores case and surrounding whitespace', () => {
	expect(accessCodeMatches('Open-Sesame', '  open-sesame ')).toBe(true);
});
it('rejects a different code', () => {
	expect(accessCodeMatches('Open-Sesame', 'wrong')).toBe(false);
});
