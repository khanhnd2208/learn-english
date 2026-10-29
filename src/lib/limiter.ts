/** Runs at most `limit` tasks at once in this process; the rest wait in arrival order. */
export function createLimiter(limit: number) {
	let active = 0;
	const waiting: Array<() => void> = [];
	return async function run<T>(task: () => Promise<T>): Promise<T> {
		if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
		else active += 1;
		try {
			return await task();
		} finally {
			// Hand the slot straight to the next caller so `active` never drops below the queue's needs.
			const next = waiting.shift();
			if (next) next();
			else active -= 1;
		}
	};
}
