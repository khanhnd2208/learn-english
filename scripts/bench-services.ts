import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cpus, totalmem, platform, release } from 'node:os';
import { parseArgs } from 'node:util';
import { assertTestDatabase } from './lib/test-database';
import { mulberry32 } from '../src/lib/english/activities/rng';

type Sample = { ms: number; queries: number; bytes: number; error?: string };
async function main() {
	assertTestDatabase(process.env.DATABASE_URL);
	process.env.PG_POOL_MAX ??= '5';
	const { values } = parseArgs({ options: { legacy: { type: 'boolean', default: false }, concurrency: { type: 'string', default: '1,25,50,100,200' }, scenario: { type: 'string', default: 'all' }, out: { type: 'string', default: 'docs/testing/load-baseline.md' }, 'think-ms': { type: 'string', default: '0' } } });
	const levels = values.concurrency!.split(',').map(Number);
	const thinkMs = Number(values['think-ms']);
	if (!Number.isFinite(thinkMs) || thinkMs < 0) throw new Error('think-ms must be >= 0');
	// Learners pause between answers; jitter 50-150% so a wave does not stay in lockstep.
	const think = (rng: { next(): number }) => thinkMs ? new Promise((resolve) => setTimeout(resolve, thinkMs * (0.5 + rng.next()))) : Promise.resolve();
	if (levels.some((n) => !Number.isInteger(n) || n < 1 || n > 200)) throw new Error('Concurrency must be 1..200');
	if (!['all', 'overview', 'srs-round', 'guided-round', 'catalog'].includes(values.scenario!)) throw new Error('Unknown scenario');
	const base = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.PG_POOL_MAX) })) });
	const context = new AsyncLocalStorage<{ queries: number }>();
	const extended = base.$extends({ query: { $allOperations: async ({ args, query }) => {
		const scope = context.getStore();
		if (scope) scope.queries++;
		return query(args);
	} } });
	// Services imported below share this instrumented singleton; production is unchanged.
	(globalThis as unknown as { _prisma: unknown })._prisma = extended;
	const daily = values.legacy ? await import('../src/lib/__dbtests__/legacy/daily') : await import('../src/services/english/enDailyService');
	const goals = values.legacy ? await import('../src/lib/__dbtests__/legacy/goals') : await import('../src/services/english/enGoalService');
	const guided = values.legacy ? await import('../src/lib/__dbtests__/legacy/guided') : await import('../src/services/english/enGuidedReviewService');
	const { listEnglishSets } = values.legacy ? await import('../src/lib/__dbtests__/legacy/catalog') : await import('../src/services/english/enCatalogService');
	const users = await base.enLearnerProfile.findMany({ where: { userId: { startsWith: 'load-user-' } }, orderBy: { userId: 'asc' }, select: { userId: true } });
	if (users.length < Math.max(...levels)) throw new Error(`Need ${Math.max(...levels)} seeded learners, found ${users.length}`);
	const lines = ['# Service load benchmark', '', `Date: ${new Date().toISOString()}`, `Host: ${platform()} ${release()}, ${cpus()[0]?.model}, ${cpus().length} CPUs, ${(totalmem() / 1024 ** 3).toFixed(1)} GiB RAM`, `Node: ${process.version}; PG_POOL_MAX=${process.env.PG_POOL_MAX}`, `Implementation: ${values.legacy ? 'frozen pre-optimization oracle' : 'current services'}. Local service calls, no HTTP/auth/network latency. One wave per level; not a production capacity guarantee.`, `Think time: ${thinkMs ? `${thinkMs} ms ±50% between answers` : 'none (every learner answers back to back)'}.`, 'Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.', '', '| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |', '|---:|---|---:|---:|---:|---:|---:|---:|---:|'];
	let peakRss = 0, peakHeap = 0;
	const sampleMemory = () => { const memory = process.memoryUsage(); peakRss = Math.max(peakRss, memory.rss); peakHeap = Math.max(peakHeap, memory.heapUsed); };
	const timer = setInterval(sampleMemory, 200);
	sampleMemory();
	try {
		for (const concurrency of levels) {
			const samples = new Map<string, Sample[]>();
			const measure = async <T>(name: string, run: () => Promise<T>): Promise<T> => {
				const scope = { queries: 0 };
				const start = performance.now();
				let result: T | undefined, error: string | undefined;
				try { result = await context.run(scope, run); return result; }
				catch (cause) { error = cause instanceof Error ? cause.message : String(cause); throw cause; }
				finally {
					const rows = samples.get(name) ?? [];
					rows.push({ ms: performance.now() - start, queries: scope.queries, bytes: result === undefined ? 0 : Buffer.byteLength(JSON.stringify(result)), ...(error ? { error } : {}) });
					samples.set(name, rows);
					sampleMemory();
				}
			};
			const scenarios = values.scenario === 'all' ? ['overview', 'srs-round', 'guided-round', 'catalog'] : [values.scenario!];
			for (const scenario of scenarios) {
				await Promise.all(users.slice(0, concurrency).map(async ({ userId }, index) => {
					try {
						const rng = mulberry32(index + 42);
						if (scenario === 'overview') await measure('overview+goals', async () => ({ overview: await daily.getTodayOverview(userId), goals: await goals.getGoalBoard(userId) }));
						if (scenario === 'catalog') await measure('catalog', () => listEnglishSets(userId, false));
						if (scenario === 'srs-round') {
							const now = new Date();
							const session = await measure('startToday', () => daily.startToday(userId, now));
							if (!session.sessionId) return;
							for (const [n, item] of session.items.slice(0, 50).entries()) {
								await think(rng);
								const at = new Date(now.getTime() + (n + 1) * 4000);
								await measure('answerToday+settleProgress', async () => {
									const answer = await daily.answerToday(userId, { sessionId: session.sessionId!, senseId: item.senseId, answer: rng.next() < 0.75 ? item.bundle.word.lemma : '', giveUp: false }, at);
									return { answer, reward: await goals.settleProgress(userId, answer.xp, at) };
								});
							}
							await measure('finishToday', () => daily.finishToday(userId, session.sessionId!, new Date(now.getTime() + 204_000)));
						}
						if (scenario === 'guided-round') {
							const enrollments = await base.enEnrollment.findMany({ where: { userId }, select: { setId: true } });
							let session = await measure('startGuidedReview', () => guided.startGuidedReview(userId, enrollments.map((row) => row.setId)));
							for (let chunk = 0; chunk < 3; chunk++) {
								session = await measure('saveStudyPosition', () => guided.saveStudyPosition(userId, session.id, 5));
								for (const question of session.questions) {
									// Public payload intentionally hides keys. Read only this question's key for the harness.
									await think(rng);
									const row = await base.enGuidedReviewQuestion.findUniqueOrThrow({ where: { id: question.id }, select: { answerKey: true } });
									await measure('answerGuidedReview+settleProgress', async () => {
										const answer = await guided.answerGuidedReview(userId, session.id, question.id, rng.next() < 0.75 ? row.answerKey : '', 4000);
										return { answer, reward: await goals.settleProgress(userId, answer.xp) };
									});
								}
								if (chunk < 2) session = await measure('nextGuidedChunk', () => guided.nextGuidedChunk(userId, session.id, false));
							}
							await measure('finishGuidedReview', () => guided.finishGuidedReview(userId, session.id));
						}
					} catch { /* Individual operation errors are recorded; other learners continue. */ }
				}));
				console.log(`Completed ${scenario} at concurrency ${concurrency}`);
			}
			for (const [name, rows] of samples) {
				const times = rows.map((row) => row.ms).sort((a, b) => a - b);
				const percentile = (p: number) => times[Math.max(0, Math.ceil(times.length * p) - 1)]!.toFixed(1);
				lines.push(`| ${concurrency} | ${name} | ${rows.length} | ${percentile(.5)} | ${percentile(.95)} | ${percentile(1)} | ${(rows.reduce((sum, row) => sum + row.queries, 0) / rows.length).toFixed(1)} | ${Math.max(...rows.map((row) => row.bytes))} | ${rows.filter((row) => row.error).length} |`);
				for (const error of new Set(rows.flatMap((row) => row.error ? [row.error] : []))) lines.push(`\nError (${concurrency}, ${name}): ${error.replaceAll('|', '/').replaceAll('\n', ' ')}\n`);
			}
		}
	} finally {
		clearInterval(timer);
		lines.push('', `Peak RSS: ${(peakRss / 1024 ** 2).toFixed(1)} MiB; peak heapUsed: ${(peakHeap / 1024 ** 2).toFixed(1)} MiB.`, 'Guided answers use real server time, so pacing may withhold XP without think time. SRS advances its injected server clock by 4 seconds per answer.');
		await mkdir(dirname(values.out!), { recursive: true });
		await writeFile(values.out!, lines.join('\n') + '\n');
		await base.$disconnect();
	}
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
