#!/usr/bin/env npx tsx
/**
 * Seed two sample test subjects, each with two 10-question papers, and enroll
 * `sample-learner`. Each paper covers both question types supported by the app.
 * Local databases only. Run: npm run db:seed:test-sample
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

const LEARNER_ID = 'sample-learner';
const mcq = (prompt: string, options: string[], correctIndex: number, explanationVi: string) => ({ type: 'mcq', prompt, options, correctIndex, answers: [] as string[], explanationVi });
const fill = (prompt: string, answers: string[], explanationVi: string) => ({ type: 'fill', prompt, options: [] as string[], correctIndex: null, answers, explanationVi });

const SUBJECTS = [
	{
		id: 'sample_test_subject_general',
		title: 'Tiếng Anh giao tiếp cơ bản',
		description: 'Bài kiểm tra mẫu về ngữ pháp, từ vựng và giao tiếp trong các tình huống hằng ngày.',
		papers: [
			{
				id: 'sample_test_paper_general_1',
				title: 'Bài 1: Giao tiếp hằng ngày',
				description: '10 câu về chào hỏi, thói quen và các tình huống quen thuộc.',
				questions: [
					mcq('She ___ to school every day.', ['go', 'goes', 'going', 'gone'], 1, 'Chủ ngữ “she” ở hiện tại đơn đi với động từ thêm -s.'),
					mcq('Câu nào phù hợp nhất để đáp lại “How are you?”', ['I am fine, thank you.', 'I am twenty years old.', 'It is Monday.', 'See you yesterday.'], 0, '“I am fine, thank you.” là lời đáp tự nhiên khi được hỏi thăm sức khỏe.'),
					mcq('We stayed at home ___ it was raining.', ['because', 'although', 'so', 'but'], 0, '“because” nối hành động với nguyên nhân.'),
					mcq('Từ nào trái nghĩa với “expensive”?', ['cheap', 'large', 'modern', 'busy'], 0, '“cheap” nghĩa là rẻ, trái nghĩa với “expensive”.'),
					mcq('There ___ two books on the table.', ['is', 'are', 'was', 'be'], 1, 'Danh từ số nhiều “two books” đi với “are”.'),
					fill('My brother ___ football every Sunday.', ['plays'], 'Thói quen ở hiện tại đơn; “my brother” là ngôi thứ ba số ít nên dùng “plays”.'),
					fill('I have lived in Da Nang ___ 2010.', ['since'], '“since” đi với một mốc thời gian.'),
					fill('Could you ___ me the way to the station?', ['show', 'tell'], 'Có thể dùng “show me the way” hoặc “tell me the way”.'),
					fill('Please turn ___ the lights before you leave.', ['off'], 'Cụm động từ “turn off” nghĩa là tắt.'),
					fill('We usually have lunch ___ noon.', ['at'], 'Dùng giới từ “at” trước thời điểm “noon”.'),
				],
			},
			{
				id: 'sample_test_paper_general_2',
				title: 'Bài 2: Du lịch và dịch vụ',
				description: '10 câu về đặt phòng, hỏi đường, ăn uống và di chuyển.',
				questions: [
					mcq('Where can you collect your luggage after a flight?', ['At baggage claim', 'At the check-in desk', 'At security', 'At the departure gate'], 0, 'Hành khách nhận hành lý tại khu vực “baggage claim”.'),
					mcq('“A single room” là loại phòng dành cho bao nhiêu người?', ['Một người', 'Hai người', 'Ba người', 'Một gia đình'], 0, '“A single room” thường là phòng dành cho một người.'),
					mcq('Which sentence is the most polite request?', ['Give me some water.', 'I want water now.', 'Could I have some water, please?', 'You bring water.'], 2, '“Could I have …, please?” là cấu trúc yêu cầu lịch sự.'),
					mcq('The train leaves ___ 8:30 a.m.', ['in', 'on', 'at', 'from'], 2, 'Dùng “at” trước giờ cụ thể.'),
					mcq('Từ nào gần nghĩa nhất với “reservation”?', ['booking', 'journey', 'passport', 'suitcase'], 0, 'Trong ngữ cảnh dịch vụ, “reservation” và “booking” đều là sự đặt chỗ.'),
					fill('I would like to ___ a room for two nights.', ['book', 'reserve'], '“book a room” và “reserve a room” đều có nghĩa là đặt phòng.'),
					fill('How much does this ticket ___?', ['cost'], 'Cấu trúc hỏi giá: “How much does … cost?”'),
					fill('Go straight ahead and turn ___ at the traffic lights.', ['left', 'right'], 'Cả “turn left” và “turn right” đều hợp ngữ pháp trong câu mẫu này.'),
					fill('Could we have the ___, please?', ['bill', 'check'], '“bill” (Anh-Anh) và “check” (Anh-Mỹ) đều dùng để xin hóa đơn.'),
					fill('You need a ___ to travel to another country.', ['passport'], 'Hộ chiếu là giấy tờ cần thiết khi đi quốc tế.'),
				],
			},
		],
	},
	{
		id: 'sample_test_subject_work',
		title: 'Tiếng Anh công sở',
		description: 'Bài kiểm tra mẫu về email, họp, dự án và giao tiếp chuyên nghiệp.',
		papers: [
			{
				id: 'sample_test_paper_work_1',
				title: 'Bài 1: Email và cuộc họp',
				description: '10 câu về thư điện tử, lịch họp và cách diễn đạt chuyên nghiệp.',
				questions: [
					mcq('Which subject line is the clearest?', ['Hello', 'Important', 'Meeting moved to 3 p.m. on Friday', 'Please read'], 2, 'Tiêu đề rõ ràng nêu trực tiếp nội dung và thời gian thay đổi.'),
					mcq('Please find the report ___ to this email.', ['attached', 'attaching', 'attach', 'attachment'], 0, 'Cấu trúc cố định trong email là “find … attached”.'),
					mcq('If you cannot attend a meeting, what should you do?', ['Ignore the invitation', 'Decline and give a brief reason', 'Join without preparation', 'Delete the calendar'], 1, 'Từ chối lịch và nêu lý do ngắn gọn là cách xử lý chuyên nghiệp.'),
					mcq('“Let us move on to the next item” dùng để làm gì?', ['Mở đầu cuộc họp', 'Chuyển sang nội dung tiếp theo', 'Kết thúc email', 'Yêu cầu nghỉ phép'], 1, 'Câu này báo hiệu cuộc họp chuyển sang mục kế tiếp.'),
					mcq('The meeting has been ___ until next Monday.', ['postponed', 'promoted', 'provided', 'prevented'], 0, '“postponed” nghĩa là được hoãn lại.'),
					fill('I am writing to ___ our meeting on Thursday.', ['confirm'], '“confirm a meeting” nghĩa là xác nhận cuộc họp.'),
					fill('Could you please send me the updated ___?', ['agenda'], '“agenda” là chương trình hoặc danh sách nội dung cuộc họp.'),
					fill('Thank you ___ your prompt reply.', ['for'], 'Cấu trúc “thank you for + danh từ”.'),
					fill('I look forward to ___ from you.', ['hearing'], 'Sau “look forward to” dùng động từ thêm -ing.'),
					fill('Please let me know if you have any ___.', ['questions', 'queries'], '“questions” và “queries” đều phù hợp trong lời kết email.'),
				],
			},
			{
				id: 'sample_test_paper_work_2',
				title: 'Bài 2: Dự án và làm việc nhóm',
				description: '10 câu về tiến độ, trách nhiệm, phản hồi và phối hợp nhóm.',
				questions: [
					mcq('A “deadline” is ___.', ['a final date for completing work', 'a list of employees', 'a type of meeting room', 'a salary increase'], 0, '“deadline” là hạn cuối phải hoàn thành công việc.'),
					mcq('Which phrase is best for giving constructive feedback?', ['This is terrible.', 'You always make mistakes.', 'The introduction is clear; the conclusion could be more specific.', 'Do it again.'], 2, 'Phản hồi xây dựng nêu điểm tốt và đề xuất cải thiện cụ thể.'),
					mcq('We need to ___ the task among four team members.', ['divide', 'invite', 'deliver', 'describe'], 0, '“divide the task among …” nghĩa là chia nhiệm vụ cho nhiều người.'),
					mcq('The project is on schedule. Điều này có nghĩa là gì?', ['Dự án đã bị hủy', 'Dự án đúng tiến độ', 'Dự án vượt ngân sách', 'Dự án chưa bắt đầu'], 1, '“on schedule” nghĩa là đúng theo lịch hoặc đúng tiến độ.'),
					mcq('Who is usually responsible for tracking project progress?', ['The project manager', 'A customer only', 'The receptionist', 'Every visitor'], 0, 'Quản lý dự án thường theo dõi tiến độ và phối hợp công việc.'),
					fill('We are currently ___ schedule.', ['on'], 'Cụm “on schedule” nghĩa là đúng tiến độ.'),
					fill('The team completed the project ahead ___ schedule.', ['of'], 'Cụm “ahead of schedule” nghĩa là sớm hơn kế hoạch.'),
					fill('Could you give me an ___ on the task?', ['update'], '“give someone an update” nghĩa là cập nhật tình hình.'),
					fill('Mai is responsible ___ preparing the presentation.', ['for'], 'Cấu trúc “be responsible for + V-ing”.'),
					fill('We need to solve this problem as soon as ___.', ['possible'], 'Cụm cố định “as soon as possible” nghĩa là sớm nhất có thể.'),
				],
			},
		],
	},
] as const;

async function main() {
	const host = new URL(process.env.DATABASE_URL ?? '').hostname;
	if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error('Refusing to seed: DATABASE_URL must point at 127.0.0.1 or localhost');
	const { prisma } = await import('@/lib/prisma');
	try {
		// Replace the original one-subject sample from earlier versions of this seed.
		await prisma.enTestSubject.deleteMany({ where: { id: 'sample_test_subject' } });
		await prisma.enTestQuestion.deleteMany({ where: { id: { in: Array.from({ length: 6 }, (_, index) => `sample_tq_${index + 1}`) } } });
		for (const [subjectIndex, subject] of SUBJECTS.entries()) {
			await prisma.enTestSubject.upsert({
				where: { id: subject.id },
				create: { id: subject.id, title: subject.title, description: subject.description, status: 'published', listed: true, sortOrder: subjectIndex },
				update: { title: subject.title, description: subject.description, status: 'published', listed: true, sortOrder: subjectIndex },
			});
			for (const [paperIndex, paper] of subject.papers.entries()) {
				await prisma.enTestPaper.upsert({
					where: { id: paper.id },
					create: { id: paper.id, subjectId: subject.id, title: paper.title, description: paper.description, status: 'published', sortOrder: paperIndex },
					update: { subjectId: subject.id, title: paper.title, description: paper.description, status: 'published', sortOrder: paperIndex },
				});
				for (const [questionIndex, question] of paper.questions.entries()) {
					const questionId = `${paper.id}_q${questionIndex + 1}`;
					await prisma.enTestQuestion.upsert({ where: { id: questionId }, create: { id: questionId, ...question }, update: question });
				}
				await prisma.enTestPaperEntry.deleteMany({ where: { paperId: paper.id } });
				await prisma.enTestPaperEntry.createMany({ data: paper.questions.map((_, questionIndex) => ({ paperId: paper.id, questionId: `${paper.id}_q${questionIndex + 1}`, position: questionIndex })) });
			}
			await prisma.enTestSubjectEnrollment.upsert({
				where: { userId_subjectId: { userId: LEARNER_ID, subjectId: subject.id } },
				create: { userId: LEARNER_ID, subjectId: subject.id },
				update: {},
			});
		}
		const paperCount = SUBJECTS.reduce((total, subject) => total + subject.papers.length, 0);
		const questionCount = SUBJECTS.reduce((total, subject) => total + subject.papers.reduce((paperTotal, paper) => paperTotal + paper.questions.length, 0), 0);
		console.log(`Seeded ${SUBJECTS.length} subjects, ${paperCount} papers and ${questionCount} questions for ${LEARNER_ID}.`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
