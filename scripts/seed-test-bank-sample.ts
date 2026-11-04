#!/usr/bin/env npx tsx
/**
 * Seed one sample test course with a 6-question paper (3 mcq, 3 fill) and enroll `sample-learner`.
 * Local databases only. Run: npm run db:seed:test-sample
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

const SUBJECT_ID = 'sample_test_subject';
const PAPER_ID = 'sample_test_paper';
const LEARNER_ID = 'sample-learner';

const mcq = (prompt: string, options: string[], correctIndex: number, explanationVi: string) => ({ type: 'mcq', prompt, options, correctIndex, answers: [] as string[], explanationVi });
const fill = (prompt: string, answers: string[], explanationVi: string) => ({ type: 'fill', prompt, options: [] as string[], correctIndex: null, answers, explanationVi });

const QUESTIONS = [
	mcq('She ___ to school every day.', ['go', 'goes', 'going', 'gone'], 1, 'Chủ ngữ số ít ở thì hiện tại đơn thêm -s.'),
	mcq('We stayed at home ___ it was raining.', ['because', 'although', 'so', 'but'], 0, '"because" nêu lý do: trời mưa nên ở nhà.'),
	mcq('Từ nào đồng nghĩa với "begin"?', ['finish', 'stop', 'start', 'leave'], 2, '"start" và "begin" đều là bắt đầu.'),
	fill('I have lived in Da Nang ___ 2010.', ['since'], '"since" đi với mốc thời gian.'),
	fill('He is a ___ doctor in our city.', ['well-known'], 'Tính từ ghép "well-known" nghĩa là nổi tiếng.'),
	fill('You ___ smoke here. It is against the rules.', ['must not', "mustn't"], '"must not" diễn tả điều bị cấm.'),
];

async function main() {
	const host = new URL(process.env.DATABASE_URL ?? '').hostname;
	if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error('Refusing to seed: DATABASE_URL must point at 127.0.0.1 or localhost');
	const { prisma } = await import('@/lib/prisma');
	try {
		await prisma.enTestSubject.upsert({
			where: { id: SUBJECT_ID },
			create: { id: SUBJECT_ID, title: 'Mẫu: Ngân hàng câu hỏi', description: 'Khóa mẫu để duyệt cách làm bài và chữa bài.', status: 'published', listed: true },
			update: { title: 'Mẫu: Ngân hàng câu hỏi', description: 'Khóa mẫu để duyệt cách làm bài và chữa bài.', status: 'published', listed: true },
		});
		await prisma.enTestPaper.upsert({
			where: { id: PAPER_ID },
			create: { id: PAPER_ID, subjectId: SUBJECT_ID, title: 'Bài mẫu 6 câu', description: '3 câu trắc nghiệm và 3 câu điền từ.', status: 'published' },
			update: { title: 'Bài mẫu 6 câu', description: '3 câu trắc nghiệm và 3 câu điền từ.', status: 'published' },
		});
		for (const [index, question] of QUESTIONS.entries()) {
			await prisma.enTestQuestion.upsert({ where: { id: `sample_tq_${index + 1}` }, create: { id: `sample_tq_${index + 1}`, ...question }, update: question });
		}
		await prisma.enTestPaperEntry.deleteMany({ where: { paperId: PAPER_ID } });
		await prisma.enTestPaperEntry.createMany({ data: QUESTIONS.map((_, index) => ({ paperId: PAPER_ID, questionId: `sample_tq_${index + 1}`, position: index })) });
		await prisma.enTestSubjectEnrollment.upsert({ where: { userId_subjectId: { userId: LEARNER_ID, subjectId: SUBJECT_ID } }, create: { userId: LEARNER_ID, subjectId: SUBJECT_ID }, update: {} });
		console.log(`Seeded ${QUESTIONS.length} questions in paper ${PAPER_ID}.`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
