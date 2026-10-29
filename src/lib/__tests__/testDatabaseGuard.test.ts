import { describe, expect, it } from 'vitest';
import { assertTestDatabase } from '../../../scripts/lib/test-database';

describe('test database write guard', () => {
	it.each([undefined, '', 'postgres://localhost/learn_english', 'postgres://remote/app_test', 'postgres://127.0.0.1/learn_english', 'postgres://localhost/app_test?host=remote', 'postgres://localhost/app_test?options=x', 'https://localhost/app_test'])('rejects unsafe target %s', (url) => expect(() => assertTestDatabase(url)).toThrow());
	it.each(['localhost', '127.0.0.1', '[::1]'])('allows an explicit local test or load target on %s', (host) => {
		expect(assertTestDatabase(`postgresql://${host}/app_test`, true)).toContain('app_test');
		expect(assertTestDatabase(`postgresql://${host}/app_load`)).toContain('app_load');
		expect(() => assertTestDatabase(`postgresql://${host}/app_load`, true)).toThrow();
	});
});
