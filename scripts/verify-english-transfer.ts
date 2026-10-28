import { Pool } from 'pg';

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
if (!sourceUrl || !targetUrl) {
	throw new Error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL');
}

const tables = ['EnWord', 'EnSense', 'EnExample', 'EnSet', 'EnSetItem'] as const;

async function count(pool: Pool, table: string): Promise<number> {
	const escaped = table.replaceAll('"', '""');
	const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "${escaped}"`);
	return Number(result.rows[0]?.count ?? 0);
}

const source = new Pool({ connectionString: sourceUrl });
const target = new Pool({ connectionString: targetUrl });

try {
	let mismatch = false;
	for (const table of tables) {
		const [sourceCount, targetCount] = await Promise.all([count(source, table), count(target, table)]);
		const matches = sourceCount === targetCount;
		mismatch ||= !matches;
		console.log(`${matches ? 'OK' : 'MISMATCH'} ${table}: ${sourceCount} -> ${targetCount}`);
	}
	if (mismatch) process.exitCode = 1;
} finally {
	await Promise.all([source.end(), target.end()]);
}
