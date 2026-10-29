import { parseArgs } from 'node:util';
import { assertTestDatabase, resetEnTables } from './lib/test-database';
import { seedWorld } from './lib/load-world';

async function main() {
	const { values } = parseArgs({ options: { users: { type: 'string', default: '200' }, sets: { type: 'string', default: '10' }, words: { type: 'string', default: '500' }, days: { type: 'string', default: '90' }, seed: { type: 'string', default: '42' }, truncate: { type: 'boolean', default: false } } });
	const url = new URL(assertTestDatabase(process.env.DATABASE_URL));
	console.log(`Target: ${url.hostname}:${url.port || 5432}${url.pathname}`);
	const opts = { users: Number(values.users), sets: Number(values.sets), words: Number(values.words), days: Number(values.days), seed: Number(values.seed) };
	if (Object.values(opts).some((n) => !Number.isSafeInteger(n) || n < 0) || !opts.users || !opts.sets || !opts.words) throw new Error('Expected positive integer users/sets/words and nonnegative days/seed');
	const { prisma } = await import('../src/lib/prisma');
	const started = performance.now();
	try {
		if (values.truncate) await resetEnTables(prisma);
		await seedWorld(prisma, opts);
		// Same derivation as the 20261102000000_en_study_day backfill, so streak reads see seeded history.
		await prisma.$executeRaw`INSERT INTO "EnStudyDay" ("userId", "day") SELECT DISTINCT "userId", to_char("at" + INTERVAL '7 hours', 'YYYY-MM-DD') FROM "EnReview" UNION SELECT s."userId", to_char(q."answeredAt" + INTERVAL '7 hours', 'YYYY-MM-DD') FROM "EnGuidedReviewQuestion" q JOIN "EnGuidedReviewSession" s ON s."id" = q."sessionId" WHERE q."kind" = 'main' AND q."answeredAt" IS NOT NULL ON CONFLICT DO NOTHING`;
		// Fresh bulk inserts have no planner statistics; without them the live-word joins pick a nested loop 5x slower than production.
		await prisma.$executeRaw`ANALYZE`;
		const { Prisma } = await import('@prisma/client');
		for (const model of Prisma.dmmf.datamodel.models.filter((model) => model.name.startsWith('En'))) {
			const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT count(*)::int AS count FROM ${Prisma.raw('"' + model.name + '"')}`);
			console.log(`${model.name}: ${rows[0]!.count}`);
		}
		console.log(`Elapsed: ${((performance.now() - started) / 1000).toFixed(1)}s`);
	} finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
