import { EN_EXAM_MAX_FILL_ANSWERS, EN_EXAM_MAX_OPTIONS, EN_EXAM_MAX_QUESTIONS, EN_EXAM_PASS_PERCENT } from './constants';
import { normalizeLearnerText } from './text';

export type ExamQuestionInput =
  | { type: 'mcq'; prompt: string; options: string[]; correctIndex: number; explanationVi: string }
  | { type: 'fill'; prompt: string; answers: string[]; explanationVi: string };
export interface ExamParseIssue { line: number; message: string }
interface DraftQuestion {
  line: number; prompt: string; options: Array<{ letter: string; text: string; correct: boolean }>;
  answers: string[] | null; explanationVi: string; answered: boolean; explained: boolean;
}

export function parseExamText(text: string): { questions: ExamQuestionInput[]; issues: ExamParseIssue[] } {
  const drafts: DraftQuestion[] = [];
  const issues: ExamParseIssue[] = [];
  let current: DraftQuestion | null = null;
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = index + 1;
    const value = raw.trim();
    if (!value) continue;
    const start = /^\s*(?:câu\s*)?(\d{1,3})\s*[.:)]\s*(.*)$/i.exec(raw);
    if (start) {
      current = { line, prompt: start[2]!.trim(), options: [], answers: null, explanationVi: '', answered: false, explained: false };
      drafts.push(current);
      continue;
    }
    if (!current) { issues.push({ line, message: `Dòng ${line}: chưa có câu hỏi nào ở phía trên.` }); continue; }
    const option = /^\s*(\*)?\s*([A-F])\s*[.)]\s*(.+)$/i.exec(raw);
    if (option) {
      current.options.push({ letter: option[2]!.toUpperCase(), text: option[3]!.trim(), correct: Boolean(option[1]) });
      current.answered = true;
      continue;
    }
    const fill = /^\s*đáp án\s*:\s*(.+)$/i.exec(raw);
    if (fill) { current.answers = fill[1]!.split('|').map((part) => part.trim()).filter(Boolean); current.answered = true; continue; }
    const explanation = /^\s*giải thích\s*:\s*(.+)$/i.exec(raw);
    if (explanation) { current.explanationVi = explanation[1]!.trim(); current.explained = true; continue; }
    if (!current.answered && !current.explained) current.prompt = `${current.prompt} ${value}`.trim();
    else issues.push({ line, message: `Dòng ${line}: không hiểu dòng này.` });
  }
  if (!drafts.length) issues.push({ line: 0, message: 'Chưa có câu hỏi nào.' });
  if (drafts.length > EN_EXAM_MAX_QUESTIONS) issues.push({ line: 0, message: 'Đề có tối đa 100 câu.' });
  const questions: ExamQuestionInput[] = [];
  for (const [index, draft] of drafts.entries()) {
    const n = index + 1;
    const issue = (message: string) => issues.push({ line: draft.line, message: `Câu ${n}: ${message}` });
    const prompt = draft.options.length ? draft.prompt : draft.prompt.replace(/_{3,}/g, '___');
    if (!prompt) issue('thiếu đề bài.');
    else if (prompt.length > 500) issue('đề bài dài quá 500 ký tự.');
    if (draft.explanationVi.length > 500) issue('giải thích dài quá 500 ký tự.');
    if (draft.options.length) {
      if (draft.options.length < 2 || draft.options.length > EN_EXAM_MAX_OPTIONS) issue('cần từ 2 đến 6 lựa chọn.');
      if (draft.options.some((option, i) => option.letter !== String.fromCharCode(65 + i))) issue('các lựa chọn phải theo thứ tự A, B, C…');
      if (draft.options.filter((option) => option.correct).length !== 1) issue('đánh dấu * trước đúng một đáp án.');
      if (draft.answers !== null) issue('câu trắc nghiệm không dùng dòng "Đáp án:".');
      if (draft.options.some((option) => option.text.length > 200)) issue('lựa chọn dài quá 200 ký tự.');
      questions.push({ type: 'mcq', prompt, options: draft.options.map((option) => option.text), correctIndex: draft.options.findIndex((option) => option.correct), explanationVi: draft.explanationVi });
    } else {
      if (draft.answers === null) issue('thiếu dòng "Đáp án:".');
      else {
        if (draft.answers.length < 1 || draft.answers.length > EN_EXAM_MAX_FILL_ANSWERS) issue('cần từ 1 đến 10 đáp án.');
        if (draft.answers.some((answer) => answer.length > 200)) issue('đáp án dài quá 200 ký tự.');
      }
      if ((prompt.match(/___/g) ?? []).length !== 1) issue('câu điền từ cần đúng một chỗ trống ___.');
      questions.push({ type: 'fill', prompt, answers: draft.answers ?? [], explanationVi: draft.explanationVi });
    }
  }
  return { questions, issues };
}

export function examToText(questions: ExamQuestionInput[]): string {
  return questions.map((question, index) => {
    const lines = [`Câu ${index + 1}: ${question.prompt}`];
    if (question.type === 'mcq') question.options.forEach((option, position) => lines.push(`${position === question.correctIndex ? '*' : ''}${String.fromCharCode(65 + position)}. ${option}`));
    else lines.push(`Đáp án: ${question.answers.join(' | ')}`);
    if (question.explanationVi) lines.push(`Giải thích: ${question.explanationVi}`);
    return lines.join('\n');
  }).join('\n\n');
}

export function gradeExamAnswer(item: { type: string; correctIndex: number | null; answers: string[] }, answer: string | null): boolean {
  if (answer === null || !answer.trim()) return false;
  if (item.type === 'mcq') return answer === String(item.correctIndex);
  if (item.type === 'fill') return item.answers.some((expected) => normalizeLearnerText(answer) === normalizeLearnerText(expected));
  return false;
}
export function isExamPassed(score: number, total: number): boolean { return total > 0 && score * 100 >= total * EN_EXAM_PASS_PERCENT; }
export function examPercent(score: number, total: number): number { return total > 0 ? Math.round(score * 100 / total) : 0; }
export function pickBestAttempt<T extends { score: number; total: number; finishedAt: Date }>(attempts: T[]): T | null {
  return attempts.reduce<T | null>((best, item) => {
    if (!best) return item;
    const comparison = item.score * best.total - best.score * item.total;
    return comparison > 0 || (comparison === 0 && item.finishedAt > best.finishedAt) ? item : best;
  }, null);
}
