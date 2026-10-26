import { EN_CEFR_LEVELS } from '@/lib/english/constants';

export type CefrLevel = (typeof EN_CEFR_LEVELS)[number];

/** Lowest level wins. `pre_a1` is the A0 band. */
export function lowestCefr(levels: Array<CefrLevel | null | undefined>): CefrLevel | null {
	let best: CefrLevel | null = null;
	for (const level of levels) {
		if (!level) continue;
		if (!best || EN_CEFR_LEVELS.indexOf(level) < EN_CEFR_LEVELS.indexOf(best)) best = level;
	}
	return best;
}
