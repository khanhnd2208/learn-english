export type Rect = { top: number; bottom: number; left: number; width: number };

const GAP = 8;
const EDGE = 16;
export const HINT_MAX_WIDTH = 288;

/**
 * Where a hint bubble goes: centred under its trigger, kept 16px inside the viewport,
 * and flipped above the trigger when there is no room below.
 */
export function placeHint(anchor: Rect, height: number, viewport: { width: number; height: number }) {
	const width = Math.min(HINT_MAX_WIDTH, viewport.width - EDGE * 2);
	const centred = anchor.left + anchor.width / 2 - width / 2;
	const left = Math.min(Math.max(centred, EDGE), viewport.width - EDGE - width);
	const below = anchor.bottom + GAP;
	const fitsBelow = below + height <= viewport.height - EDGE;
	const top = fitsBelow ? below : Math.max(EDGE, anchor.top - GAP - height);
	return { top, left, width };
}
