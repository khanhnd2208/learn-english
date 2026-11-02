import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  examFindUnique: vi.fn(), attemptFindUnique: vi.fn(), attemptFindFirst: vi.fn(), attemptCreate: vi.fn(), attemptUpdate: vi.fn(),
  questionFindMany: vi.fn(), itemCreateMany: vi.fn(), itemFindMany: vi.fn(), itemUpdate: vi.fn(), itemUpdateMany: vi.fn(),
  xpCreate: vi.fn(), wordUpdate: vi.fn(), reviewCreate: vi.fn(), dayCreate: vi.fn(),
}));
vi.mock('@/lib/prisma', () => {
  const tx = {
    enExam: { findUnique: mock.examFindUnique },
    enExamAttempt: { findUnique: mock.attemptFindUnique, findFirst: mock.attemptFindFirst, create: mock.attemptCreate, update: mock.attemptUpdate },
    enExamQuestion: { findMany: mock.questionFindMany },
    enExamAttemptItem: { createMany: mock.itemCreateMany, findMany: mock.itemFindMany, update: mock.itemUpdate, updateMany: mock.itemUpdateMany },
    enXpEvent: { create: mock.xpCreate }, enWordState: { update: mock.wordUpdate }, enReview: { create: mock.reviewCreate }, enStudyDay: { create: mock.dayCreate },
  };
  return { prisma: { ...tx, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } };
});
import { answerExam, finishExam, startExam } from '@/services/english/enExamService';
const exam = { id: 'exam', courseId: 'course', course: { id: 'course', title: 'Course', enrollments: [{ id: 'enrolled' }] }, setId: null, set: null, status: 'published', _count: { questions: 1 } };
const question = { id: 'q1', position: 0, type: 'mcq', prompt: 'Pick', options: ['a', 'b'], correctIndex: 1, answers: [], explanationVi: 'Because' };
const item = { ...question, id: 'i1', attemptId: 'attempt', answer: null, correct: null, answeredAt: null };
const attempt = { id: 'attempt', userId: 'user', examId: 'exam', activeKey: 'user:exam', status: 'in_progress', position: 0, total: 1, score: null, startedAt: new Date(), finishedAt: null, items: [item], exam: { courseId: 'course' } };
const noLearningWrites = () => { expect(mock.xpCreate).not.toHaveBeenCalled(); expect(mock.wordUpdate).not.toHaveBeenCalled(); expect(mock.reviewCreate).not.toHaveBeenCalled(); expect(mock.dayCreate).not.toHaveBeenCalled(); };
beforeEach(() => {
  vi.clearAllMocks();
  mock.examFindUnique.mockResolvedValue(exam);
  mock.attemptFindUnique.mockResolvedValue(null);
  mock.questionFindMany.mockResolvedValue([question]);
  mock.attemptCreate.mockResolvedValue(attempt);
  mock.itemFindMany.mockResolvedValue([item]);
  mock.attemptFindFirst.mockResolvedValue(attempt);
  mock.attemptUpdate.mockResolvedValue(attempt);
});
it('requires course enrollment for a learner', async () => {
  mock.examFindUnique.mockResolvedValue({ ...exam, course: { ...exam.course, enrollments: [] } });
  await expect(startExam('user', 'exam', false)).rejects.toMatchObject({ status: 403, message: 'Hãy đăng ký khóa học để làm bài kiểm tra.' });
  noLearningWrites();
});
it('resumes an active attempt without creating another', async () => {
  mock.attemptFindUnique.mockResolvedValue(attempt);
  const result = await startExam('user', 'exam', false);
  expect(mock.attemptCreate).not.toHaveBeenCalled();
  expect(result.id).toBe('attempt');
  noLearningWrites();
});
it('snapshots questions and returns only public item keys', async () => {
  const result = await startExam('user', 'exam', false);
  expect(mock.itemCreateMany).toHaveBeenCalledWith({ data: [{ attemptId: 'attempt', position: 0, type: 'mcq', prompt: 'Pick', options: ['a', 'b'], correctIndex: 1, answers: [], explanationVi: 'Because' }] });
  expect(Object.keys(result.items[0]!)).toEqual(['position', 'type', 'prompt', 'options', 'answer']);
  noLearningWrites();
});
it('does not let another user answer', async () => {
  mock.attemptFindFirst.mockResolvedValue(null);
  await expect(answerExam('other', 'attempt', 0, '1')).rejects.toMatchObject({ status: 404, message: 'Không tìm thấy lượt làm bài' });
  expect(mock.attemptFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'attempt', userId: 'other', status: 'in_progress' } }));
});
it('rejects an option outside the snapshot', async () => {
  await expect(answerExam('user', 'attempt', 0, '9')).rejects.toMatchObject({ status: 400, message: 'Câu trả lời không hợp lệ' });
  expect(mock.itemUpdate).not.toHaveBeenCalled();
});
it('saves a valid answer without returning its grade', async () => {
  expect(await answerExam('user', 'attempt', 0, '1')).toEqual({ saved: true });
  noLearningWrites();
});
it('finishes once and returns the saved result on retry', async () => {
  const finished = { ...attempt, status: 'finished', activeKey: null, score: 0, finishedAt: new Date(), items: [{ ...item, correct: false }] };
  mock.attemptUpdate.mockResolvedValue(finished);
  const first = await finishExam('user', 'attempt');
  mock.attemptFindFirst.mockResolvedValue(finished);
  const second = await finishExam('user', 'attempt');
  expect(first).toEqual(second);
  expect(mock.attemptUpdate).toHaveBeenCalledTimes(1);
  expect(mock.itemUpdateMany).toHaveBeenCalledWith({ where: { attemptId: 'attempt', answer: null }, data: { correct: false } });
  expect(first).toMatchObject({ score: 0, total: 1, items: [{ correct: false, answer: null }] });
  noLearningWrites();
});
