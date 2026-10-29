import { spawnSync } from 'node:child_process';
import { assertTestDatabase } from './lib/test-database';

if (!process.env.TEST_DATABASE_URL) {
	console.log('DB tests skipped: TEST_DATABASE_URL is not set');
} else {
	assertTestDatabase(process.env.TEST_DATABASE_URL, true);
	const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.db.config.ts', ...process.argv.slice(2)], { stdio: 'inherit' });
	process.exitCode = result.status ?? 1;
}
