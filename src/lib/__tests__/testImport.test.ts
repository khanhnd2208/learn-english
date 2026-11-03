import { expect, test } from 'vitest';
import { parseTestRows, TEST_COLUMNS, testRowsOf } from '@/lib/english/testImport';

const H = [...TEST_COLUMNS] as string[];
const mcqRow = (over: Partial<Record<number, string>> = {}) => {
  const row = ['Trắc nghiệm', 'Q', 'a', 'b', '', '', '', '', 'A', ''];
  for (const [index, value] of Object.entries(over)) row[Number(index)] = value!;
  return row;
};
const fillRow = (over: Partial<Record<number, string>> = {}) => {
  const row = ['Điền từ', 'I lived here ___ 2010.', '', '', '', '', '', '', 'since', ''];
  for (const [index, value] of Object.entries(over)) row[Number(index)] = value!;
  return row;
};
const messages = (rows: string[][]) => parseTestRows(rows).issues.map((issue) => issue.message);

test('parses a multiple choice row', () => {
  expect(parseTestRows([H, ['Trắc nghiệm', 'She ___ to school.', 'go', 'goes', 'going', '', '', '', 'B', 'Thêm -s.']])).toEqual({
    questions: [{ type: 'mcq', prompt: 'She ___ to school.', options: ['go', 'goes', 'going'], correctIndex: 1, explanationVi: 'Thêm -s.' }], issues: [],
  });
});
test('parses a fill row and normalizes the blank', () => {
  expect(parseTestRows([H, ['điền từ', 'I lived here ____ 2010.', '', '', '', '', '', '', 'since | from', '']]).questions).toEqual([{ type: 'fill', prompt: 'I lived here ___ 2010.', answers: ['since', 'from'], explanationVi: '' }]);
});
test('accepts a lower-case header with stray spaces', () => {
  expect(parseTestRows([[' loại ', ...H.slice(1)], mcqRow()]).issues).toEqual([]);
});
test('rejects a wrong header with a single issue', () => {
  expect(parseTestRows([['Type', 'Question'], mcqRow()])).toEqual({ questions: [], issues: [{ row: 1, message: 'Dòng 1: tiêu đề cột phải là: Loại, Câu hỏi, A, B, C, D, E, F, Đáp án đúng, Giải thích.' }] });
});
test('needs at least one question', () => {
  expect(parseTestRows([H]).issues).toEqual([{ row: 0, message: 'File chưa có câu hỏi nào.' }]);
});
test('skips blank rows', () => {
  const result = parseTestRows([H, Array(10).fill(''), mcqRow()]);
  expect(result.issues).toEqual([]);
  expect(result.questions).toHaveLength(1);
});
test.each([
  [[H, ['Tự luận', 'Q']], 'Dòng 2: cột Loại phải là “Trắc nghiệm” hoặc “Điền từ”.'],
  [[H, mcqRow({ 1: '' })], 'Dòng 2: thiếu câu hỏi.'],
  [[H, mcqRow({ 2: 'a', 3: '', 4: 'c' })], 'Dòng 2: các lựa chọn phải điền liền nhau từ cột A.'],
  [[H, mcqRow({ 3: '' })], 'Dòng 2: câu trắc nghiệm cần ít nhất 2 lựa chọn (cột A và B).'],
  [[H, mcqRow({ 2: 'Go', 3: 'go ' })], 'Dòng 2: có hai lựa chọn giống nhau.'],
  [[H, mcqRow({ 8: '2' })], 'Dòng 2: cột Đáp án đúng phải là một chữ từ A đến F.'],
  [[H, mcqRow({ 8: 'C' })], 'Dòng 2: đáp án đúng trỏ vào một lựa chọn trống.'],
  [[H, fillRow({ 1: 'No blank here.' })], 'Dòng 2: câu điền từ cần đúng một chỗ trống ___.'],
  [[H, fillRow({ 1: 'A ___ and ___.' })], 'Dòng 2: câu điền từ cần đúng một chỗ trống ___.'],
  [[H, fillRow({ 2: 'x' })], 'Dòng 2: câu điền từ để trống các cột A–F.'],
  [[H, fillRow({ 8: ' | ' })], 'Dòng 2: câu điền từ cần từ 1 đến 10 đáp án, cách nhau bằng dấu |.'],
  [[H, fillRow({ 8: Array.from({ length: 11 }, (_, i) => `a${i}`).join('|') })], 'Dòng 2: câu điền từ cần từ 1 đến 10 đáp án, cách nhau bằng dấu |.'],
  [[H, mcqRow({ 1: 'x'.repeat(501) })], 'Dòng 2: câu hỏi dài quá 500 ký tự.'],
  [[H, mcqRow({ 2: 'x'.repeat(201) })], 'Dòng 2: lựa chọn dài quá 200 ký tự.'],
  [[H, mcqRow({ 9: 'x'.repeat(501) })], 'Dòng 2: giải thích dài quá 500 ký tự.'],
  [[H, fillRow({ 8: 'x'.repeat(201) })], 'Dòng 2: đáp án dài quá 200 ký tự.'],
])('reports %#', (rows, message) => { expect(messages(rows as string[][])).toContain(message); });
test('accepts a lower-case answer letter', () => {
  expect(parseTestRows([H, mcqRow({ 8: 'b' })]).questions[0]).toMatchObject({ correctIndex: 1 });
});
test('limits a paper to 100 questions', () => {
  expect(messages([H, ...Array.from({ length: 101 }, () => mcqRow())])).toContain('Một bài có tối đa 100 câu.');
});
test('reports only the bad row', () => {
  expect(parseTestRows([H, mcqRow(), mcqRow({ 8: 'Z' })]).issues.map((issue) => issue.row)).toEqual([3]);
});
test('round trips through rows', () => {
  const q = parseTestRows([H, ['Trắc nghiệm', 'She ___ to school.', 'go', 'goes', 'going', '', '', '', 'B', 'Thêm -s.'], ['Điền từ', 'I lived here ___ 2010.', '', '', '', '', '', '', 'since | from', '']]).questions;
  expect(parseTestRows(testRowsOf(q)).questions).toEqual(q);
});
