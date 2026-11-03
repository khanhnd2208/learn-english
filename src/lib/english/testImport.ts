import { EN_TEST_MAX_FILL_ANSWERS, EN_TEST_MAX_OPTIONS, EN_TEST_MAX_QUESTIONS } from './constants';
import { normalizeLearnerText } from './text';
import type { TestQuestionInput } from './testPaper';

export const TEST_SHEET_NAME = 'Câu hỏi';
export const TEST_COLUMNS = ['Loại', 'Câu hỏi', 'A', 'B', 'C', 'D', 'E', 'F', 'Đáp án đúng', 'Giải thích'] as const;
/** `row = 0` is an error of the whole file. */
export interface TestImportIssue { row: number; message: string }

const MCQ = 'trắc nghiệm';
const FILL = 'điền từ';
const lower = (value: string) => value.trim().toLocaleLowerCase('vi');

export function parseTestRows(rows: string[][]): { questions: TestQuestionInput[]; issues: TestImportIssue[] } {
  const header = rows[0] ?? [];
  if (TEST_COLUMNS.some((column, index) => lower(header[index] ?? '') !== lower(column))) {
    return { questions: [], issues: [{ row: 1, message: `Dòng 1: tiêu đề cột phải là: ${TEST_COLUMNS.join(', ')}.` }] };
  }
  const questions: TestQuestionInput[] = [];
  const issues: TestImportIssue[] = [];
  let count = 0;
  for (const [index, raw] of rows.slice(1).entries()) {
    const row = index + 2;
    const cells = TEST_COLUMNS.map((_, i) => (raw[i] ?? '').trim());
    if (cells.every((cell) => !cell)) continue;
    count++;
    const [type, promptRaw, , , , , , , answerRaw, explanationVi] = cells as [string, string, string, string, string, string, string, string, string, string];
    const optionCells = cells.slice(2, 8);
    const found: string[] = [];
    const issue = (message: string) => found.push(message);
    if (lower(type) !== MCQ && lower(type) !== FILL) {
      issues.push({ row, message: `Dòng ${row}: cột Loại phải là “Trắc nghiệm” hoặc “Điền từ”.` });
      continue;
    }
    const isMcq = lower(type) === MCQ;
    const prompt = isMcq ? promptRaw : promptRaw.replace(/_{3,}/g, '___');
    if (!prompt) issue('thiếu câu hỏi.');
    else if (prompt.length > 500) issue('câu hỏi dài quá 500 ký tự.');
    if (explanationVi.length > 500) issue('giải thích dài quá 500 ký tự.');
    if (isMcq) {
      const filled = optionCells.filter(Boolean).length;
      const options = optionCells.slice(0, filled);
      if (options.some((option) => !option)) issue('các lựa chọn phải điền liền nhau từ cột A.');
      else if (filled < 2) issue('câu trắc nghiệm cần ít nhất 2 lựa chọn (cột A và B).');
      if (options.length <= EN_TEST_MAX_OPTIONS) {
        if (options.some((option) => option.length > 200)) issue('lựa chọn dài quá 200 ký tự.');
        const normalized = options.map(normalizeLearnerText);
        if (new Set(normalized).size !== normalized.length) issue('có hai lựa chọn giống nhau.');
      }
      const letter = answerRaw.toUpperCase();
      if (!/^[A-F]$/.test(letter)) issue('cột Đáp án đúng phải là một chữ từ A đến F.');
      else if (!optionCells[letter.charCodeAt(0) - 65]) issue('đáp án đúng trỏ vào một lựa chọn trống.');
      if (!found.length) questions.push({ type: 'mcq', prompt, options: optionCells.filter(Boolean), correctIndex: letter.charCodeAt(0) - 65, explanationVi });
    } else {
      if (optionCells.some(Boolean)) issue('câu điền từ để trống các cột A–F.');
      if ((prompt.match(/___/g) ?? []).length !== 1) issue('câu điền từ cần đúng một chỗ trống ___.');
      const answers = answerRaw.split('|').map((part) => part.trim()).filter(Boolean);
      if (answers.length < 1 || answers.length > EN_TEST_MAX_FILL_ANSWERS) issue(`câu điền từ cần từ 1 đến ${EN_TEST_MAX_FILL_ANSWERS} đáp án, cách nhau bằng dấu |.`);
      else if (answers.some((answer) => answer.length > 200)) issue('đáp án dài quá 200 ký tự.');
      if (!found.length) questions.push({ type: 'fill', prompt, answers, explanationVi });
    }
    for (const message of found) issues.push({ row, message: `Dòng ${row}: ${message}` });
  }
  if (!count) issues.push({ row: 0, message: 'File chưa có câu hỏi nào.' });
  if (count > EN_TEST_MAX_QUESTIONS) issues.push({ row: 0, message: `Một bài có tối đa ${EN_TEST_MAX_QUESTIONS} câu.` });
  return { questions, issues };
}

export function testRowsOf(questions: TestQuestionInput[]): string[][] {
  return [[...TEST_COLUMNS], ...questions.map((question) => {
    if (question.type === 'mcq') {
      const options = Array.from({ length: 6 }, (_, i) => question.options[i] ?? '');
      return ['Trắc nghiệm', question.prompt, ...options, String.fromCharCode(65 + question.correctIndex), question.explanationVi];
    }
    return ['Điền từ', question.prompt, '', '', '', '', '', '', question.answers.join(' | '), question.explanationVi];
  })];
}
