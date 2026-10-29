import { Prisma, type PrismaClient } from '@prisma/client';
import { mulberry32 } from '../../src/lib/english/activities/rng';
import { shiftVnDay, vnDayKey, vnWeekDays } from '../../src/lib/english/gapRule';
import { vnDayStart } from '../../src/lib/english/schedule';
import { dailyQuests, weeklyQuests } from '../../src/lib/english/quests';
import { assertTestDatabase } from './test-database';

export type WorldOptions = { users: number; sets: number; words: number; days: number; seed: number; now?: Date; guidedSessions?: number };
const BATCH = 5000;
async function batches<T>(rows: T[], write: (chunk: T[]) => Promise<unknown>) {
	for (let i = 0; i < rows.length; i += BATCH) await write(rows.slice(i, i + BATCH));
}

export async function seedWorld(db: PrismaClient, options: WorldOptions) {
	assertTestDatabase(process.env.DATABASE_URL);
	const { users, sets, words, days, seed } = options;
	const rng = mulberry32(seed);
	const now = options.now ?? new Date();
	const today = vnDayKey(now);
	const setIds = Array.from({ length: sets }, (_, i) => `load-set-${i}`);
	const senseIds = Array.from({ length: sets * words }, (_, i) => `load-sense-${i}`);
	const userIds = Array.from({ length: users }, (_, i) => `load-user-${String(i + 1).padStart(4, '0')}`);
	await db.enSet.createMany({ data: setIds.map((id, sortOrder) => ({ id, title: `Load set ${sortOrder}`, status: 'published', sortOrder })) });
	await batches(senseIds, (ids) => db.enWord.createMany({ data: ids.map((id) => {
		const index = Number(id.split('-').at(-1));
		const lemma = `word${String(index + 1).padStart(4, '0')}`;
		return { id: `load-word-${index}`, lemma, lemmaKey: lemma, forms: [lemma + 's'], status: 'published' };
	}) }));
	await batches(senseIds, (ids) => db.enSense.createMany({ data: ids.map((id) => {
		const index = Number(id.split('-').at(-1));
		return { id, wordId: `load-word-${index}`, meaningVi: `Nghĩa của từ ${index}`, partOfSpeech: ['noun', 'verb', 'adj', 'adv'][index % 4], synonyms: Array.from({ length: rng.int(3) }, (_, n) => `synonym${index}_${n}`), advanced: [{ kind: 'collocation', phrase: `use word${index}`, meaningVi: 'Cách dùng', example: `Please use word${index}.` }], family: [{ word: `family${index}`, partOfSpeech: 'noun', meaningVi: 'Từ cùng họ' }], status: 'published' };
	}) }));
	await batches(senseIds.flatMap((senseId, index) => Array.from({ length: 4 }, (_, n): Prisma.EnExampleCreateManyInput => ({ id: `${senseId}-example-${n}`, senseId, english: `Example ${n}: please use ___ today.`, meaningVi: 'Hãy dùng từ này hôm nay.', target: `word${String(index + 1).padStart(4, '0')}`, role: n === 0 ? 'study' : 'grade', status: 'published', sortOrder: n }))), (data) => db.enExample.createMany({ data }));
	await batches(senseIds.map((senseId, index) => ({ setId: setIds[Math.floor(index / words)]!, senseId, position: index % words })), (data) => db.enSetItem.createMany({ data }));
	for (const [userIndex, userId] of userIds.entries()) {
		const selected = rng.shuffle(setIds).slice(0, Math.min(sets, 6 + rng.int(5)));
		const pool = senseIds.filter((_, i) => selected.includes(setIds[Math.floor(i / words)]!));
		await db.enEnrollment.createMany({ data: selected.map((setId, i) => ({ userId, setId, createdAt: new Date(now.getTime() - (selected.length - i) * 86400_000) })) });
		await batches(rng.shuffle(pool).slice(0, Math.floor(pool.length * 0.6)).map((senseId) => {
			const roll = rng.next();
			const box = roll < 0.15 ? 1 : roll < 0.35 ? 2 : roll < 0.55 ? 3 : roll < 0.8 ? 4 : 5;
			return { userId, senseId, box, lapses: rng.int(4), dueAt: new Date(now.getTime() + (rng.int(71) - 10) * 86400_000), introducedAt: new Date(now.getTime() - days * 86400_000), lastReviewedAt: rng.next() < 0.05 ? null : new Date(now.getTime() - rng.int(30) * 86400_000) };
		}), (data) => db.enWordState.createMany({ data }));
		const sessions: Prisma.EnPracticeSessionCreateManyInput[] = [];
		const reviews: Prisma.EnReviewCreateManyInput[] = [];
		const xp: Prisma.EnXpEventCreateManyInput[] = [];
		for (let offset = 0; offset < days; offset++) {
			const day = shiftVnDay(today, -offset);
			const start = vnDayStart(day).getTime() + 8 * 3600_000;
			// Two 0..150 rolls give mean 150 and a tail capped at 250.
			const count = Math.min(250, rng.int(151) + rng.int(151));
			for (let n = 0; n < count; n++) {
				const chunk = Math.floor(n / 50);
				const sessionId = `${userId}-${day}-${chunk}`;
				const senseId = pool[rng.int(pool.length)]!;
				if (n % 50 === 0) sessions.push({ id: sessionId, userId, mode: 'review', senseIds: [], startedAt: new Date(start + n * 4000), endedAt: new Date(start + Math.min(count, n + 50) * 4000), activeSeconds: Math.min(50, count - n) * 4 });
				sessions.at(-1)!.senseIds = [...sessions.at(-1)!.senseIds as string[], senseId];
				const correct = rng.next() < 0.75;
				const scheduled = rng.next() < 0.85;
				const at = new Date(start + (n + 1) * 4000);
				const id = `${sessionId}-review-${n}`;
				reviews.push({ id, sessionId, userId, senseId, at, prompt: 'free', correct, scheduled, responseMs: 4000, boxBefore: 1 + rng.int(5), boxAfter: correct ? 3 : 1 });
				xp.push({ userId, sourceKey: `load:${id}`, kind: scheduled ? 'review' : 'extra', xp: correct ? 10 : 0, day, at });
			}
		}
		await batches(sessions, (data) => db.enPracticeSession.createMany({ data }));
		await batches(reviews, (data) => db.enReview.createMany({ data }));
		await batches(xp, (data) => db.enXpEvent.createMany({ data }));
		const guided: Prisma.EnGuidedReviewSessionCreateManyInput[] = [];
		const questions: Prisma.EnGuidedReviewQuestionCreateManyInput[] = [];
		for (let run = 0; run < (options.guidedSessions ?? 20); run++) {
			const id = `${userId}-guided-${run}`;
			const start = new Date(now.getTime() - (run + 1) * 86400_000);
			guided.push({ id, userId, selectedSetIds: selected, poolSenseIds: pool, remainingSenseIds: pool.slice(20), currentChunkSenseIds: pool.slice(15, 20), chunkNumber: 4, phase: 'finished', startedAt: start, endedAt: new Date(start.getTime() + 100_000), activeSeconds: 80 });
			for (let n = 0; n < 20; n++) questions.push({ id: `${id}-q-${n}`, sessionId: id, chunkNumber: 1 + Math.floor(n / 5), position: n % 5, senseId: pool[n % pool.length]!, kind: 'main', role: 'meaning', activityKey: 'meaning_choice', prompt: {}, answerKey: 'answer', answer: 'answer', correct: rng.next() < 0.75, responseMs: 4000, answeredAt: new Date(start.getTime() + (n + 1) * 4000) });
		}
		await batches(guided, (data) => db.enGuidedReviewSession.createMany({ data }));
		await batches(questions, (data) => db.enGuidedReviewQuestion.createMany({ data }));
		await db.enLearnerProfile.create({ data: { userId, dailyXpGoal: 400, dailyGoalChosenAt: now } });
		const ctx = { tier: 1, weeklyDaysGoal: 4, srsAvailable: pool.length, enrolledSets: selected.length };
		await db.enQuestBoard.createMany({ data: [{ userId, period: 'daily', periodKey: today, quests: dailyQuests(ctx) }, { userId, period: 'weekly', periodKey: vnWeekDays(today)[0]!, quests: weeklyQuests(ctx) }] });
		if (users > 4 && (userIndex + 1) % 20 === 0) console.log(`Seeded ${userIndex + 1}/${users} learners`);
	}
	return { userIds, setIds, senseIds, now };
}
