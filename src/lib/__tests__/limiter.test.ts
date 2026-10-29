import { expect, it } from 'vitest';
import { createLimiter } from '@/lib/limiter';

it('runs at most the limit at once, in arrival order, and frees slots after failures', async () => {
	const run = createLimiter(2);
	let active = 0, peak = 0;
	const started: number[] = [];
	const task = (n: number) => run(async () => {
		started.push(n);
		active += 1; peak = Math.max(peak, active);
		await new Promise((resolve) => setTimeout(resolve, 5));
		active -= 1;
		if (n === 1) throw new Error('boom');
		return n;
	});
	const results = await Promise.allSettled([0, 1, 2, 3, 4].map(task));
	expect(peak).toBe(2);
	expect(started).toEqual([0, 1, 2, 3, 4]);
	expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled', 'fulfilled', 'fulfilled']);
	expect(await run(async () => 'free')).toBe('free');
});
