import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';
import { vnDayKey } from '@/lib/english/gapRule';
import { questProgress, missionsForSetQuest, type QuestFacts } from '@/lib/english/gamify/quest';

const schema = z.object({ kind: z.enum(['set_mastery', 'hold_words', 'clear_mistakes', 'study_days']), setId: z.string().optional(), target: z.number().int().min(1).max(5000), days: z.number().int().min(1).max(90) }).strict();
export const GET = withAuth(async (_request, user) => {
	const today = vnDayKey(new Date());
	await prisma.enQuest.updateMany({ where: { userId: user.id, status: 'active', endDay: { lt: today } }, data: { status: 'ended' } });
	const quests = await prisma.enQuest.findMany({ where: { userId: user.id, status: { in: ['active', 'done', 'ended'] } }, orderBy: { createdAt: 'desc' }, include: { rewards: true } });
	const rows = await Promise.all(quests.map(async (quest) => {
		const [masteredInSet, heldWords, mistakeCount, mistakesAtStart, attempts, practiceDays, practiceSessions, setMistakes] = await Promise.all([
			quest.setId ? prisma.enWordState.count({ where: { userId: user.id, status: 'mastered', sense: { setItems: { some: { setId: quest.setId } } } } }) : Promise.resolve(0),
			prisma.enXpEvent.count({ where: { userId: user.id, kind: 'hold_7d', createdAt: { gte: new Date(`${quest.startDay}T00:00:00+07:00`), lte: new Date(`${quest.endDay}T23:59:59+07:00`) } } }),
			prisma.enWordState.count({ where: { userId: user.id, inMistakeBook: true } }),
			prisma.enTestWordResult.count({ where: { userId: user.id, passed: false, counted: true, createdAt: { lt: new Date(`${quest.startDay}T00:00:00+07:00`) } } }),
			prisma.enTestAttempt.findMany({ where: { userId: user.id, status: 'finished', finishedAt: { gte: new Date(`${quest.startDay}T00:00:00+07:00`), lte: new Date(`${quest.endDay}T23:59:59+07:00`) } }, select: { finishedAt: true } }),
			prisma.enPracticeSession.findMany({ where: { userId: user.id, activeSeconds: { gte: 300 }, startedAt: { gte: new Date(`${quest.startDay}T00:00:00+07:00`), lte: new Date(`${quest.endDay}T23:59:59+07:00`) } }, select: { startedAt: true } }),
			quest.setId ? prisma.enPracticeSession.findMany({ where: { userId: user.id, setId: quest.setId, startedAt: { gte: new Date(`${quest.startDay}T00:00:00+07:00`), lte: new Date(`${quest.endDay}T23:59:59+07:00`) } }, select: { id: true } }) : Promise.resolve([]),
			quest.setId ? prisma.enWordState.count({ where: { userId: user.id, inMistakeBook: true, sense: { setItems: { some: { setId: quest.setId } } } } }) : Promise.resolve(0),
		]);
		const facts: QuestFacts = { masteredInSet, heldWords, mistakeCount: mistakeCount + mistakesAtStart, studyDays: new Set([...attempts.flatMap((row) => row.finishedAt ? [vnDayKey(row.finishedAt)] : []), ...practiceDays.map((row) => vnDayKey(row.startedAt))]).size };
		const progress = questProgress(quest.kind === 'hold_words' ? { ...quest, kind: 'hold_words' } : quest, facts);
		const expired = today > quest.endDay;
		const status = progress.done ? 'done' : expired ? 'ended' : quest.status;
		if (status !== quest.status) await prisma.enQuest.update({ where: { id: quest.id }, data: { status, completedAt: status === 'done' ? new Date() : null } });
		return { ...quest, status, progress, missions: quest.kind === 'set_mastery' ? missionsForSetQuest(masteredInSet, quest.target, practiceSessions.length > 0, setMistakes) : undefined };
	}));
	return apiSuccess(rows);
});
export const POST = withAuth(async (request, user) => {
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thông tin nhiệm vụ chưa hợp lệ', 400);
	if (parsed.data.kind === 'set_mastery' && !parsed.data.setId) return apiError('Hãy chọn bộ từ cho nhiệm vụ này', 400);
	if (parsed.data.kind === 'set_mastery') {
		const enrolled = await prisma.enEnrollment.findUnique({ where: { userId_setId: { userId: user.id, setId: parsed.data.setId! } } });
		if (!enrolled) return apiError('Bạn cần tham gia bộ từ trước khi tạo nhiệm vụ', 403);
	}
	const today = vnDayKey(new Date());
	const [year, month, day] = today.split('-').map(Number);
	const end = new Date(Date.UTC(year, month - 1, day + parsed.data.days - 1)).toISOString().slice(0, 10);
	const quest = await prisma.enQuest.create({ data: { userId: user.id, ...parsed.data, setId: parsed.data.setId ?? null, startDay: today, endDay: end } });
	return apiSuccess(quest);
});
