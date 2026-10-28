// Warns before `next dev` when the local database is behind prisma/migrations, so a stale schema
// shows up as one clear line instead of a PrismaClientValidationError on the first page.
import { spawnSync } from 'node:child_process';

const status = spawnSync('npx', ['prisma', 'migrate', 'status'], { encoding: 'utf8' });
const output = `${status.stdout ?? ''}${status.stderr ?? ''}`;

if (/have not yet been applied/.test(output)) {
	const pending = output.split('\n').filter((line) => /^\d{14}_/.test(line.trim())).map((line) => `  - ${line.trim()}`);
	console.warn(['', '⚠  Local database is missing migrations:', ...pending, '   Back it up with pg_dump, then run: npx prisma migrate deploy', ''].join('\n'));
} else if (status.status !== 0) {
	console.warn('⚠  Could not check migrations (is the database running?). Continuing.');
}
