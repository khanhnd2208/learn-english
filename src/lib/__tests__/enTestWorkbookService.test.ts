import ExcelJS from 'exceljs';
import { expect, test } from 'vitest';
import { parseTestRows, TEST_COLUMNS } from '@/lib/english/testImport';
import type { TestQuestionInput } from '@/lib/english/testPaper';
import { buildTestWorkbook, readTestWorkbook } from '@/services/english/enTestWorkbookService';

const toArrayBuffer = (buffer: Buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
const questions: TestQuestionInput[] = [
  { type: 'mcq', prompt: 'She ___ to school.', options: ['go', 'goes', 'going'], correctIndex: 1, explanationVi: 'Thêm -s.' },
  { type: 'fill', prompt: 'I lived here ___ 2010.', answers: ['since', 'from'], explanationVi: '' },
];

test('the template holds only the header row', async () => {
  const rows = await readTestWorkbook(toArrayBuffer(await buildTestWorkbook([])));
  expect(rows).toEqual([[...TEST_COLUMNS]]);
  expect(parseTestRows(rows).issues).toEqual([{ row: 0, message: 'File chưa có câu hỏi nào.' }]);
});
test('questions survive a write and a read', async () => {
  const rows = await readTestWorkbook(toArrayBuffer(await buildTestWorkbook(questions)));
  expect(parseTestRows(rows).questions).toEqual(questions);
});
test('the template has a guide sheet', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(toArrayBuffer(await buildTestWorkbook([])));
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Câu hỏi', 'Hướng dẫn']);
});
test('rejects a workbook without the question sheet', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Sheet1');
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await expect(readTestWorkbook(toArrayBuffer(buffer))).rejects.toMatchObject({ message: 'Không thấy trang tính “Câu hỏi” trong file.' });
});
test('rejects a file that is not a workbook', async () => {
  await expect(readTestWorkbook(new TextEncoder().encode('not a zip').buffer as ArrayBuffer)).rejects.toMatchObject({ message: 'Không đọc được file Excel.' });
});
