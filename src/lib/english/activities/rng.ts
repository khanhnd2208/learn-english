export interface Rng {
	next(): number;
	int(count: number): number;
	pick<T>(items: readonly T[]): T | null;
	shuffle<T>(items: readonly T[]): T[];
}

export function mulberry32(seed: number): Rng {
	let state = seed >>> 0;
	const next = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int(count: number) {
			if (count <= 0) return 0;
			return Math.floor(next() * count);
		},
		pick(items) {
			if (items.length === 0) return null;
			return items[Math.floor(next() * items.length)] ?? null;
		},
		shuffle(items) {
			const copy = [...items];
			for (let index = copy.length - 1; index > 0; index -= 1) {
				const swap = Math.floor(next() * (index + 1));
				const current = copy[index]!;
				copy[index] = copy[swap]!;
				copy[swap] = current;
			}
			return copy;
		},
	};
}

export function randomRng(): Rng {
	return mulberry32((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
}
