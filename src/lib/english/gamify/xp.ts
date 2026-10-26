import { vnDayDistance, vnDayKey } from '@/lib/english/gapRule';

export type XpKind = 'first_mastery' | 'hold_7d' | 'hold_30d';
export interface XpHistoryRow { passed: boolean; counted: boolean; createdAt: Date; }
export interface NewXpEvent { kind: XpKind; amount: number; }

export function holdSince(history: XpHistoryRow[]): Date | null {
	let since: Date | null = null;
	for (const row of [...history].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
		if (!row.counted) continue;
		if (!row.passed) since = null;
		else if (!since) since = row.createdAt;
	}
	return since;
}

export function xpEventsForResult(history: XpHistoryRow[], current: XpHistoryRow, earned: XpKind[], now = current.createdAt): NewXpEvent[] {
	if (!current.passed || !current.counted) return [];
	const result: NewXpEvent[] = [];
	const add = (kind: XpKind, amount: number) => { if (!earned.includes(kind)) result.push({ kind, amount }); };
	const successful = history.filter((row) => row.counted && row.passed);
	if (successful.length === 0) add('first_mastery', 5);
	const priorHistory = history.filter((row) => row.counted && row.createdAt.getTime() < current.createdAt.getTime()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	const since = holdSince(priorHistory);
	if (since && priorHistory.some((row) => row.passed)) {
	const days = vnDayDistance(vnDayKey(since), vnDayKey(now));
		if (days >= 7 && successful.length > 0) add('hold_7d', 10);
		if (days >= 30 && successful.length > 0) add('hold_30d', 20);
	}
	return result;
}
