import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { encode } from 'next-auth/jwt';
import { assertTestDatabase } from './lib/test-database';
import { mulberry32, type Rng } from '../src/lib/english/activities/rng';

const STEPS = ['home', 'daily/start', 'daily/answer', 'daily/finish', 'review page', 'review/start', 'review/study', 'review/answer', 'review/next', 'review/finish'] as const;
type Step = (typeof STEPS)[number];
type Sample = { ms: number; error?: string };
type DailyStart = { sessionId: string | null; items: Array<{ senseId: string; bundle: { word: { lemma: string } } }> };
type GuidedSession = { id: string; remainingCount: number; questions: Array<{ id: string }> };
type GuidedAnswer = { session: GuidedSession };

function integer(value: string, name: string, min: number, max: number): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be ${min}..${max}`);
	return parsed;
}

function percentile(times: number[], fraction: number): string {
	return times[Math.max(0, Math.ceil(times.length * fraction) - 1)]!.toFixed(1);
}

const sleep = (ms: number) => ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

async function think(rng: Rng, thinkMs: number): Promise<number> {
	const started = performance.now();
	await sleep(thinkMs * (0.5 + rng.next()));
	return Math.round(performance.now() - started);
}

async function main() {
	const databaseUrl = assertTestDatabase(process.env.DATABASE_URL);
	const { values } = parseArgs({ options: {
		'base-url': { type: 'string', default: 'http://localhost:3102' },
		users: { type: 'string', default: '200' },
		'think-ms': { type: 'string', default: '4000' },
		'ramp-ms': { type: 'string', default: '60000' },
		seed: { type: 'string', default: '42' },
		label: { type: 'string', default: 'local' },
		out: { type: 'string', default: 'docs/testing/load-http-local.md' },
	} });
	const baseUrl = new URL(values['base-url']!);
	if (!['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname)) throw new Error('Refusing base URL: expected localhost');
	if (!process.env.BENCH_AUTH_SECRET) throw new Error('BENCH_AUTH_SECRET is required');
	const userCount = integer(values.users!, 'users', 1, 200);
	const thinkMs = integer(values['think-ms']!, 'think-ms', 0, Number.MAX_SAFE_INTEGER);
	const rampMs = integer(values['ramp-ms']!, 'ramp-ms', 0, Number.MAX_SAFE_INTEGER);
	const seed = integer(values.seed!, 'seed', 0, 0xffffffff);
	const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: databaseUrl, max: Number(process.env.PG_POOL_MAX ?? 10) })) });
	const samples = new Map<Step, Sample[]>(STEPS.map((step) => [step, []]));
	const flowErrors: string[] = [];
	let firstRequest = Number.POSITIVE_INFINITY;
	let lastResponse = 0;
	let answers = 0;

	async function request<T>(step: Step, cookie: string, path: string, body?: object): Promise<T> {
		const started = performance.now();
		firstRequest = Math.min(firstRequest, started);
		let error: string | undefined;
		try {
			const response = await fetch(new URL(path, baseUrl), {
				method: body === undefined ? 'GET' : 'POST',
				headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
				body: body === undefined ? undefined : JSON.stringify(body),
				redirect: 'manual',
			});
			const responseBody = await response.text();
			if (response.status >= 300 && response.status < 400) throw new Error(`redirect ${response.status}`);
			if (!response.ok || (step === 'home' && response.status !== 200)) throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 120)}`);
			if (path.startsWith('/api/')) {
				const payload = JSON.parse(responseBody) as { ok?: boolean; data?: T; error?: string };
				if (payload.ok !== true || !Object.hasOwn(payload, 'data')) throw new Error(`Invalid API response: ${responseBody.slice(0, 120)}`);
				if (step === 'daily/answer' || step === 'review/answer') answers += 1;
				return payload.data as T;
			}
			return undefined as T;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : String(cause);
			throw cause;
		} finally {
			const ended = performance.now();
			lastResponse = Math.max(lastResponse, ended);
			samples.get(step)!.push({ ms: ended - started, ...(error ? { error } : {}) });
		}
	}

	try {
		const users = await prisma.enLearnerProfile.findMany({ where: { userId: { startsWith: 'load-user-' } }, orderBy: { userId: 'asc' }, take: userCount, select: { userId: true } });
		if (users.length !== userCount) throw new Error(`Need ${userCount} seeded learners, found ${users.length}`);
		const enrollments = await prisma.enEnrollment.findMany({ where: { userId: { in: users.map((user) => user.userId) } }, select: { userId: true, setId: true } });
		const setsByUser = new Map(users.map((user) => [user.userId, enrollments.filter((row) => row.userId === user.userId).map((row) => row.setId)]));
		const cookies = await Promise.all(users.map(async ({ userId }) => {
			const token = await encode({ token: { sub: userId, email: `${userId}@load.test`, name: userId, role: 'student' }, secret: process.env.BENCH_AUTH_SECRET!, salt: 'authjs.session-token', maxAge: 3600 });
			return `authjs.session-token=${token}`;
		}));
		await Promise.all(users.map(async ({ userId }, index) => {
			const rng = mulberry32(seed + index);
			await sleep(rampMs * rng.next());
			const cookie = cookies[index]!;
			try {
				await request<void>('home', cookie, '/');
				const daily = await request<DailyStart>('daily/start', cookie, '/api/daily/start', {});
				for (const item of daily.items) {
					const responseMs = await think(rng, thinkMs);
					await request('daily/answer', cookie, '/api/daily/answer', { sessionId: daily.sessionId, senseId: item.senseId, answer: rng.next() < 0.85 ? item.bundle.word.lemma : 'zzzz', responseMs });
				}
				if (daily.sessionId !== null) await request('daily/finish', cookie, '/api/daily/finish', { sessionId: daily.sessionId });
				await request<void>('home', cookie, '/');
				await request<void>('review page', cookie, '/review');
				let session = await request<GuidedSession>('review/start', cookie, '/api/review', { action: 'start', setIds: setsByUser.get(userId)! });
				for (let chunk = 0; chunk < 3; chunk += 1) {
					session = await request<GuidedSession>('review/study', cookie, '/api/review', { action: 'study', sessionId: session.id, position: 5 });
					for (const question of session.questions) {
						await think(rng, thinkMs);
						const row = await prisma.enGuidedReviewQuestion.findUniqueOrThrow({ where: { id: question.id }, select: { answerKey: true } });
						const answer = await request<GuidedAnswer>('review/answer', cookie, '/api/review', { action: 'answer', sessionId: session.id, questionId: question.id, answer: rng.next() < 0.75 ? row.answerKey : '', responseMs: 4000 });
						session = answer.session;
					}
					if (session.remainingCount === 0) break;
					if (chunk < 2) session = await request<GuidedSession>('review/next', cookie, '/api/review', { action: 'next', sessionId: session.id });
				}
				await request('review/finish', cookie, '/api/review', { action: 'finish', sessionId: session.id });
			} catch (cause) {
				flowErrors.push(`${userId}: ${cause instanceof Error ? cause.message : String(cause)}`);
			}
		}));
		const lines = [
			`# HTTP load benchmark (${values.label})`, '',
			`Date: ${new Date().toISOString()}`,
			`Base URL: ${baseUrl.toString()}`,
			`Users: ${userCount}; think-ms: ${thinkMs}; ramp-ms: ${rampMs}; seed: ${seed}.`,
			'Measured end to end over HTTP, including auth, React Server Components and React cache.', '',
			'| Step | N | p50 ms | p95 ms | max ms | Errors |',
			'|---|---:|---:|---:|---:|---:|',
		];
		for (const step of STEPS) {
			const rows = samples.get(step)!;
			const times = rows.map((row) => row.ms).sort((a, b) => a - b);
			lines.push(`| ${step} | ${rows.length} | ${rows.length ? percentile(times, .5) : '—'} | ${rows.length ? percentile(times, .95) : '—'} | ${rows.length ? percentile(times, 1) : '—'} | ${rows.filter((row) => row.error).length} |`);
		}
		const elapsed = Number.isFinite(firstRequest) ? (lastResponse - firstRequest) / 1000 : 0;
		lines.push('', `Total run time: ${elapsed.toFixed(1)} s; answer requests per second: ${elapsed > 0 ? (answers / elapsed).toFixed(2) : '0.00'} (${answers} successful daily/answer and review/answer requests).`);
		for (const step of STEPS) for (const error of new Set(samples.get(step)!.flatMap((row) => row.error ? [row.error] : []))) lines.push(`Error (${step}): ${error.replaceAll('|', '/').replaceAll('\n', ' ')}`);
		for (const error of flowErrors) if (!STEPS.some((step) => samples.get(step)!.some((row) => row.error && error.endsWith(row.error)))) lines.push(`Flow error: ${error.replaceAll('|', '/').replaceAll('\n', ' ')}`);
		await mkdir(dirname(values.out!), { recursive: true });
		await writeFile(values.out!, lines.join('\n') + '\n');
		console.log(`Wrote ${values.out}: ${answers} answers, ${flowErrors.length} failed learners`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
