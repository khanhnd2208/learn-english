import ExcelJS from 'exceljs';
import { AppError } from '@/lib/appError';
import { TEST_COLUMNS, TEST_SHEET_NAME, testRowsOf } from '@/lib/english/testImport';
import type { TestQuestionInput } from '@/lib/english/testPaper';

const GUIDE_ROWS = [
  'Cách điền trang tính “Câu hỏi”',
  'Mỗi dòng là một câu. Không đổi dòng tiêu đề. Dòng trống được bỏ qua.',
  'Loại: ghi “Trắc nghiệm” hoặc “Điền từ”.',
  'Trắc nghiệm: điền các lựa chọn vào cột A, B, C… liền nhau (2 đến 6 lựa chọn). Cột “Đáp án đúng” ghi một chữ, ví dụ B.',
  'Điền từ: trong câu hỏi viết ___ (ba dấu gạch dưới) ở chỗ trống. Để trống các cột A–F. Cột “Đáp án đúng” ghi đáp án; nhiều đáp án chấp nhận thì cách nhau bằng dấu |, ví dụ: since | from.',
  'Giải thích: không bắt buộc, hiện cho học viên sau khi nộp bài.',
  'Ví dụ:',
  'Trắc nghiệm | She ___ to school every day. | go | goes | going | gone | | | B | Chủ ngữ số ít ở thì hiện tại đơn thêm -s.',
  'Điền từ | I have lived here ___ 2010. | | | | | | | since | “since” + mốc thời gian.',
  'Trắc nghiệm | Từ nào nghĩa là “hài lòng”? | angry | pleased | tired | | | | B |',
];
const COLUMN_WIDTHS = [14, 60, 18, 18, 18, 18, 18, 18, 18, 40];

export async function readTestWorkbook(data: ArrayBuffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(data); }
  catch { throw new AppError('Không đọc được file Excel.', 400); }
  const sheet = workbook.getWorksheet(TEST_SHEET_NAME);
  if (!sheet) throw new AppError('Không thấy trang tính “Câu hỏi” trong file.', 400);
  const rows: string[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    rows.push(Array.from({ length: TEST_COLUMNS.length }, (_, c) => row.getCell(c + 1).text.trim()));
  }
  // Formatted but empty rows below the data (the Loại drop-down) are not content.
  while (rows.length > 1 && rows[rows.length - 1]!.every((cell) => !cell)) rows.pop();
  return rows;
}

export async function buildTestWorkbook(questions: TestQuestionInput[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(TEST_SHEET_NAME, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = COLUMN_WIDTHS.map((width) => ({ width }));
  for (const row of testRowsOf(questions)) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true };
  for (let r = 2; r <= 101; r++) sheet.getCell(`A${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Trắc nghiệm,Điền từ"'] };
  const guide = workbook.addWorksheet('Hướng dẫn');
  guide.getColumn(1).width = 120;
  for (const line of GUIDE_ROWS) guide.addRow([line]);
  guide.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
