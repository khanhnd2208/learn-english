import { expect, test } from 'vitest';
import { examPercent, examToText, gradeExamAnswer, isExamPassed, parseExamText, pickBestAttempt } from '@/lib/english/exam';

const sample = `Câu 1: She ___ to school every day.
A. go
*B. goes
C. going
D. gone
Giải thích: Chủ ngữ số ít ở thì hiện tại đơn thêm -s.

Câu 2: I have lived here ___ 2010.
Đáp án: since
Giải thích: "since" + mốc thời gian.

3. Từ nào nghĩa là "hài lòng"?
A. angry
*B. pleased
C. tired`;
const messages = (text: string) => parseExamText(text).issues.map((issue) => issue.message);

test('parses sample exam and round trips through text', () => {
  const parsed = parseExamText(sample);
  expect(parsed.issues).toEqual([]);
  expect(parsed.questions).toEqual([
    { type: 'mcq', prompt: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], correctIndex: 1, explanationVi: 'Chủ ngữ số ít ở thì hiện tại đơn thêm -s.' },
    { type: 'fill', prompt: 'I have lived here ___ 2010.', answers: ['since'], explanationVi: '"since" + mốc thời gian.' },
    { type: 'mcq', prompt: 'Từ nào nghĩa là "hài lòng"?', options: ['angry', 'pleased', 'tired'], correctIndex: 1, explanationVi: '' },
  ]);
  expect(parseExamText(examToText(parsed.questions)).questions).toEqual(parsed.questions);
});
test('normalizes a fill blank and multiple answers', () => {
  expect(parseExamText('Câu 1: Go ____ home.\nĐáp án: back | away').questions[0]).toMatchObject({ prompt: 'Go ___ home.', answers: ['back', 'away'] });
});
test.each([
  ['Câu 1: Pick.\n*A. a\n*B. b', 'Câu 1: đánh dấu * trước đúng một đáp án.'],
  ['Câu 1: Pick.\n*A. a\nC. c', 'Câu 1: các lựa chọn phải theo thứ tự A, B, C…'],
  ['Câu 1: Pick.\n*A. a', 'Câu 1: cần từ 2 đến 6 lựa chọn.'],
  ['Câu 1: No blank.\nĐáp án: a', 'Câu 1: câu điền từ cần đúng một chỗ trống ___.'],
  ['Câu 1: A ___ .', 'Câu 1: thiếu dòng "Đáp án:".'],
  ['Câu 1: Pick.\n*A. a\nB. b\nĐáp án: a', 'Câu 1: câu trắc nghiệm không dùng dòng "Đáp án:".'],
  ['xin chào', 'Dòng 1: chưa có câu hỏi nào ở phía trên.'],
  ['', 'Chưa có câu hỏi nào.'],
])('reports exact parse issue for %s', (input, expected) => expect(messages(input)).toContain(expected));
test('rejects 101 questions and joins prompt continuation lines', () => {
  expect(messages(Array.from({ length: 101 }, (_, i) => `Câu ${i + 1}: A ___ .\nĐáp án: a`).join('\n'))).toContain('Đề có tối đa 100 câu.');
  expect(parseExamText('Câu 1: Read:\nTom is tall.\nA. yes\n*B. no').questions[0]).toMatchObject({ prompt: 'Read: Tom is tall.' });
});
test('grades answers and computes pass, percent, and best attempt', () => {
  expect(gradeExamAnswer({ type: 'mcq', correctIndex: 2, answers: [] }, '2')).toBe(true);
  expect(gradeExamAnswer({ type: 'mcq', correctIndex: 2, answers: [] }, '1')).toBe(false);
  expect(gradeExamAnswer({ type: 'mcq', correctIndex: 2, answers: [] }, null)).toBe(false);
  expect(gradeExamAnswer({ type: 'fill', correctIndex: null, answers: ['since'] }, '  Since. ')).toBe(true);
  expect(gradeExamAnswer({ type: 'fill', correctIndex: null, answers: ['since'] }, 'sinse')).toBe(false);
  expect([isExamPassed(8, 10), isExamPassed(7, 10), isExamPassed(4, 5), isExamPassed(0, 0)]).toEqual([true, false, true, false]);
  expect(examPercent(2, 3)).toBe(67);
  const d1 = new Date('2026-01-01'), d2 = new Date('2026-01-02');
  const first = { score: 7, total: 10, finishedAt: d1 }, second = { score: 4, total: 5, finishedAt: d2 };
  expect(pickBestAttempt([first, second])).toBe(second);
  expect(pickBestAttempt([{ score: 8, total: 10, finishedAt: d1 }, second])).toBe(second);
  expect(pickBestAttempt([])).toBeNull();
});
