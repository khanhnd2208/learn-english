import { execFileSync } from 'node:child_process';
import { assertTestDatabase } from '../../../scripts/lib/test-database';

export default function setup() {
	const url = assertTestDatabase(process.env.TEST_DATABASE_URL, true);
	execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'scripts/prisma-test.config.ts'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
