#!/usr/bin/env npx tsx
/**
 * Rebuild XP for answers and quizzes recorded before the XP ledger existed.
 *
 *   npx tsx scripts/en-backfill-xp.ts --dry-run
 *   npx tsx scripts/en-backfill-xp.ts --apply
 *
 * Dry-run is the default. Every event keeps the same source key as live play, so running it
 * again (or after learners earned XP live) adds nothing twice. Quests and achievements are not
 * written here: they unlock the next time each learner opens the app.
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

import { vnDayKey } from '@/lib/english/gapRule';
import { quizXpEvent, reviewXpEvents, type XpEventInput } from '@/lib/english/xp';

type Row = XpEventInput & { userId: string; day: string; at: Date };

async function main() {
	const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
	const { prisma } = await import('@/lib/prisma');

	const rows: Row[] = [];
	const extraByUserDay = new Map<string, number>();
	const reviews = await prisma.enReview.findMany({ orderBy: { at: 'asc' }, select: { id: true, userId: true, senseId: true, at: true, correct: true, scheduled: true, boxBefore: true, boxAfter: true } });
	for (const review of reviews) {
		const day = vnDayKey(review.at);
		const capKey = `${review.userId}:${day}`;
		for (const event of reviewXpEvents(review, extraByUserDay.get(capKey) ?? 0, true)) {
			if (event.kind === 'extra') extraByUserDay.set(capKey, (extraByUserDay.get(capKey) ?? 0) + event.xp);
			rows.push({ ...event, userId: review.userId, day, at: review.at });
		}
	}

	const attempts = await prisma.enTestAttempt.findMany({ where: { status: 'finished', finishedAt: { not: null } }, orderBy: { finishedAt: 'asc' }, select: { userId: true, blueprint: true, passedCount: true, wordCount: true, finishedAt: true } });
	for (const attempt of attempts) {
		const data = attempt.blueprint as { kind?: string; v?: number } | null;
		if (data?.v !== 2 || !data.kind || !attempt.finishedAt) continue;
		const day = vnDayKey(attempt.finishedAt);
		// Same key as live play, so the first quiz of each kind on a day wins and later ones are skipped.
		const event = quizXpEvent(data.kind, day, attempt.passedCount ?? 0, attempt.wordCount);
		if (event) rows.push({ ...event, userId: attempt.userId, day, at: attempt.finishedAt });
	}

	// Within one run the first event per key wins, like the unique index does.
	const seen = new Set<string>();
	const unique = rows.filter((row) => {
		const key = `${row.userId}:${row.sourceKey}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	const perUser = new Map<string, number>();
	for (const row of unique) perUser.set(row.userId, (perUser.get(row.userId) ?? 0) + row.xp);
	console.log(`${reviews.length} reviews, ${attempts.length} finished quizzes → ${unique.length} XP events for ${perUser.size} learners`);
	for (const [userId, xp] of perUser) console.log(`  ${userId}: ${xp} XP`);

	if (!apply) {
		console.log('Dry run. Pass --apply to write.');
	} else {
		let inserted = 0;
		for (let index = 0; index < unique.length; index += 1000) {
			const result = await prisma.enXpEvent.createMany({ data: unique.slice(index, index + 1000), skipDuplicates: true });
			inserted += result.count;
		}
		console.log(`Inserted ${inserted} new XP events (${unique.length - inserted} already existed).`);
	}
	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
