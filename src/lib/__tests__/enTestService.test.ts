import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  paperFindUnique: vi.fn(), attemptFindUnique: vi.fn(), attemptFindFirst: vi.fn(), attemptCreate: vi.fn(), attemptUpdate: vi.fn(),
  questionFindMany: vi.fn(), itemCreateMany: vi.fn(), itemFindMany: vi.fn(), itemUpdate: vi.fn(), itemUpdateMany: vi.fn(),
  xpCreate: vi.fn(), wordUpdate: vi.fn(), reviewCreate: vi.fn(), dayCreate: vi.fn(),
}));
vi.mock('@/services/english/enTestWorkbookService', () => ({ readTestWorkbook: vi.fn(async () => [['Loại', 'Câu hỏi', 'A', 'B', 'C', 'D', 'E', 'F', 'Đáp án đúng', 'Giải thích'], ['Tự luận', 'Q']]), buildTestWorkbook: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  const tx = {
    enTestPaper: { findUnique: mock.paperFindUnique },
    enTestPaperAttempt: { findUnique: mock.attemptFindUnique, findFirst: mock.attemptFindFirst, create: mock.attemptCreate, update: mock.attemptUpdate },
    enTestPaperQuestion: { findMany: mock.questionFindMany },
    enTestPaperAttemptItem: { createMany: mock.itemCreateMany, findMany: mock.itemFindMany, update: mock.itemUpdate, updateMany: mock.itemUpdateMany },
  };
  return { prisma: { ...tx, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } };
});
import { answerTestPaper, finishTestPaper, saveTestPaper, startTestPaper } from '@/services/english/enTestService';
const paper = { id: 'paper', subjectId: 'subject', subject: { id: 'subject', title: 'Subject', status: 'published', enrollments: [{ id: 'enrolled' }] }, status: 'published', _count: { questions: 1 } };
const question = { id: 'q1', position: 0, type: 'mcq', prompt: 'Pick', options: ['a', 'b'], correctIndex: 1, answers: [], explanationVi: 'Because' };
const item = { ...question, id: 'i1', attemptId: 'attempt', answer: null, correct: null, answeredAt: null };
const attempt = { id: 'attempt', userId: 'user', paperId: 'paper', activeKey: 'user:paper', status: 'in_progress', position: 0, total: 1, score: null, startedAt: new Date(), finishedAt: null, items: [item], paper: { subjectId: 'subject' } };
// The mocked client has no learning tables, so any XP / word-state / review write would throw.
const noLearningWrites = () => undefined;
beforeEach(() => {
  vi.clearAllMocks();
  mock.paperFindUnique.mockResolvedValue(paper);
  mock.attemptFindUnique.mockResolvedValue(null);
  mock.questionFindMany.mockResolvedValue([question]);
  mock.attemptCreate.mockResolvedValue(attempt);
  mock.itemFindMany.mockResolvedValue([item]);
  mock.attemptFindFirst.mockResolvedValue(attempt);
  mock.attemptUpdate.mockResolvedValue(attempt);
});
it('requires subject enrollment for a learner', async () => {
  mock.paperFindUnique.mockResolvedValue({ ...paper, subject: { ...paper.subject, enrollments: [] } });
  await expect(startTestPaper('user', 'paper', false)).rejects.toMatchObject({ status: 403, message: 'Hãy đăng ký khóa học để làm bài kiểm tra.' });
  noLearningWrites();
});
it('resumes an active attempt without creating another', async () => {
  mock.attemptFindUnique.mockResolvedValue(attempt);
  const result = await startTestPaper('user', 'paper', false);
  expect(mock.attemptCreate).not.toHaveBeenCalled();
  expect(result.id).toBe('attempt');
  noLearningWrites();
});
it('snapshots questions and returns only public item keys', async () => {
  const result = await startTestPaper('user', 'paper', false);
  expect(mock.itemCreateMany).toHaveBeenCalledWith({ data: [{ attemptId: 'attempt', position: 0, type: 'mcq', prompt: 'Pick', options: ['a', 'b'], correctIndex: 1, answers: [], explanationVi: 'Because' }] });
  expect(Object.keys(result.items[0]!)).toEqual(['position', 'type', 'prompt', 'options', 'answer']);
  noLearningWrites();
});
it('does not let another user answer', async () => {
  mock.attemptFindFirst.mockResolvedValue(null);
  await expect(answerTestPaper('other', 'attempt', 0, '1')).rejects.toMatchObject({ status: 404, message: 'Không tìm thấy lượt làm bài' });
  expect(mock.attemptFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'attempt', userId: 'other', status: 'in_progress' } }));
});
it('rejects an option outside the snapshot', async () => {
  await expect(answerTestPaper('user', 'attempt', 0, '9')).rejects.toMatchObject({ status: 400, message: 'Câu trả lời không hợp lệ' });
  expect(mock.itemUpdate).not.toHaveBeenCalled();
});
it('saves a valid answer without returning its grade', async () => {
  expect(await answerTestPaper('user', 'attempt', 0, '1')).toEqual({ saved: true });
  noLearningWrites();
});
it('finishes once and returns the saved result on retry', async () => {
  const finished = { ...attempt, status: 'finished', activeKey: null, score: 0, finishedAt: new Date(), items: [{ ...item, correct: false }] };
  mock.attemptUpdate.mockResolvedValue(finished);
  const first = await finishTestPaper('user', 'attempt');
  mock.attemptFindFirst.mockResolvedValue(finished);
  const second = await finishTestPaper('user', 'attempt');
  expect(first).toEqual(second);
  expect(mock.attemptUpdate).toHaveBeenCalledTimes(1);
  expect(mock.itemUpdateMany).toHaveBeenCalledWith({ where: { attemptId: 'attempt', answer: null }, data: { correct: false } });
  expect(first).toMatchObject({ score: 0, total: 1, items: [{ correct: false, answer: null }] });
  noLearningWrites();
});
it('scores two right, one blank and one wrong as 50%', async () => {
  const items = [0, 1, 2, 3].map((position) => ({ ...item, id: `i${position}`, position, correct: position < 2 ? true : null, answer: position < 2 ? '1' : position === 3 ? '0' : null }));
  mock.attemptFindFirst.mockResolvedValue({ ...attempt, total: 4, items });
  mock.attemptUpdate.mockImplementation(async ({ data }: { data: { score: number } }) => ({ ...attempt, total: 4, status: 'finished', score: data.score, items: items.map((row) => ({ ...row, correct: row.correct ?? false })) }));
  expect(await finishTestPaper('user', 'attempt')).toMatchObject({ score: 2, total: 4, percent: 50, passed: false });
});
it('does not open a transaction when the file still has errors', async () => {
  const transaction = vi.spyOn((await import('@/lib/prisma')).prisma, '$transaction');
  await expect(saveTestPaper({ subjectId: 'subject', title: 'T', description: '', data: new ArrayBuffer(0), publish: false })).rejects.toMatchObject({ message: 'File còn lỗi, hãy sửa rồi tải lên lại.' });
  expect(transaction).not.toHaveBeenCalled();
});
