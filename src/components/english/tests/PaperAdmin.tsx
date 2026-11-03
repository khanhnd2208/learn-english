'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import PaperCard from '@/components/english/tests/PaperCard';
import type { TestImportIssue } from '@/lib/english/testImport';
import type { TestQuestionInput } from '@/lib/english/testPaper';
import type { AdminTestSubject } from '@/services/english/enTestSubjectService';

type Preview = { questions: TestQuestionInput[]; issues: TestImportIssue[] };
const XLSX_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function PaperAdmin({ subjects }: { subjects: AdminTestSubject[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  async function api(path: string, method: string, data?: object | FormData) {
    const init: RequestInit = { method };
    if (data instanceof FormData) init.body = data;
    else if (data) { init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(data); }
    const response = await fetch(path, init);
    const body = await response.json() as { ok?: boolean; error?: string; data?: unknown };
    if (!response.ok || !body.ok) throw new Error(body.error ?? 'Dữ liệu bài kiểm tra không hợp lệ');
    return body.data;
  }
  function form(action: 'preview' | 'save', publish = false) {
    const data = new FormData();
    data.set('action', action); data.set('file', file!);
    if (action === 'save') {
      data.set('subjectId', subjectId); data.set('title', title); data.set('description', description); data.set('publish', String(publish));
      if (editing) data.set('paperId', editing);
    }
    return data;
  }
  function newPaper() { setEditing(null); setTitle(''); setDescription(''); setFile(null); setPreview(null); setError(''); setOpen(true); }
  function replacePaper(id: string) {
    const owner = subjects.find((subject) => subject.papersList.some((row) => row.id === id));
    const paper = owner?.papersList.find((row) => row.id === id);
    if (owner) setSubjectId(owner.id);
    setEditing(id); setTitle(paper?.title ?? ''); setDescription(paper?.description ?? ''); setFile(null); setPreview(null); setError(''); setOpen(true);
  }
  async function previewFile() {
    setPending(true); setError('');
    try { setPreview(await api('/api/admin/tests/import', 'POST', form('preview')) as Preview); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Dữ liệu bài kiểm tra không hợp lệ'); }
    finally { setPending(false); }
  }
  async function save(publish: boolean) {
    setPending(true); setError('');
    try {
      await api('/api/admin/tests/import', 'POST', form('save', publish));
      toast(publish ? 'Đã lưu và xuất bản.' : 'Đã lưu bản nháp.', 'success'); setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dữ liệu bài kiểm tra không hợp lệ'); }
    finally { setPending(false); }
  }
  async function changeStatus(id: string, status: 'draft' | 'published') {
    setPending(true); setError('');
    try { await api(`/api/admin/tests/papers/${id}`, 'PATCH', { status }); if (status === 'draft') toast('Đã ẩn bài kiểm tra.', 'success'); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tìm thấy bài kiểm tra'); }
    finally { setPending(false); }
  }
  async function removePaper() {
    if (!deleteId) return;
    setPending(true); setError('');
    try { await api(`/api/admin/tests/papers/${deleteId}`, 'DELETE'); toast('Đã xóa bài kiểm tra.', 'success'); setDeleteId(null); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tìm thấy bài kiểm tra'); }
    finally { setPending(false); }
  }
  const canSave = Boolean(title.trim() && file && preview && !preview.issues.length && preview.questions.length > 0 && !pending);
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl">Bài kiểm tra</h1><Button type="button" disabled={pending || !subjects.length} onClick={newPaper}>+ Nhập bài kiểm tra</Button></div>
    {!subjects.length && <p className="text-sm text-muted">Chưa có khóa học. Tạo khóa học trước ở mục Khóa học.</p>}
    {open && <div className="space-y-3 rounded-card border border-border bg-surface p-4">
      <label className="block text-sm font-bold">Khóa học<select value={subjectId} disabled={Boolean(editing)} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal">{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.title}</option>)}</select></label>
      <label className="block text-sm font-bold">Tên bài<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label>
      <label className="block text-sm font-bold">Mô tả<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-surface p-3 font-normal" /></label>
      <label className="block text-sm font-bold">File Excel (.xlsx)<input type="file" accept={XLSX_ACCEPT} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError(''); }} className="mt-1 block w-full text-sm font-normal" /></label>
      <p className="text-xs text-muted"><a href="/api/admin/tests/template" download className="font-bold text-accent">Tải file mẫu</a></p>
      <p className="text-xs text-muted">Mỗi dòng là một câu. Cột Loại ghi “Trắc nghiệm” hoặc “Điền từ”. Xem trang tính “Hướng dẫn” trong file mẫu.</p>
      {editing && <p className="text-xs text-muted">File mới sẽ thay toàn bộ câu hỏi. Kết quả cũ của học viên vẫn giữ nguyên.</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={pending || !file} onClick={() => void previewFile()}>Xem trước</Button><Button type="button" variant="secondary" disabled={!canSave} onClick={() => void save(false)}>Lưu nháp</Button><Button type="button" disabled={!canSave} onClick={() => void save(true)}>Lưu &amp; xuất bản</Button><Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Huỷ</Button></div>
      {preview && <div className="space-y-2 border-t border-border pt-3"><h4 className="font-bold">Xem trước · {preview.questions.length} câu</h4>{preview.issues.map((issue, index) => <p key={`${issue.row}-${index}`} className="text-sm text-error">{issue.message}</p>)}{preview.issues.length > 0 && <p className="text-sm text-muted">File còn {preview.issues.length} lỗi. Sửa trong Excel rồi chọn lại file.</p>}{preview.questions.map((question, index) => <div key={index} className="text-sm"><p className="font-bold">{index + 1}. {question.prompt}</p><p className="text-xs text-muted">{question.type === 'mcq' ? 'Trắc nghiệm' : 'Điền từ'}</p>{question.type === 'mcq' ? question.options.map((option, i) => <p key={i} className={i === question.correctIndex ? 'font-bold' : ''}>{String.fromCharCode(65 + i)}. {option}</p>) : <p>Đáp án: {question.answers.join(' / ')}</p>}{question.explanationVi && <p>Giải thích: {question.explanationVi}</p>}</div>)}</div>}
    </div>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {subjects.filter((subject) => subject.papersList.length > 0).map((subject) => <section key={subject.id} className="space-y-2"><h2 className="text-lg font-bold">{subject.title}</h2><ul className="space-y-2">{subject.papersList.map((paper) => <li key={paper.id} className="space-y-1.5"><PaperCard paper={paper} /><div className="flex flex-wrap gap-2"><a href={`/api/admin/tests/papers/${paper.id}`} download className="inline-flex min-h-10 items-center rounded-control border border-border px-3 text-xs font-bold">Tải về</a><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => replacePaper(paper.id)}>Thay đề</Button><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void changeStatus(paper.id, paper.status === 'published' ? 'draft' : 'published')}>{paper.status === 'published' ? 'Ẩn' : 'Xuất bản'}</Button><Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setDeleteId(paper.id)}>Xóa</Button></div></li>)}</ul></section>)}
    <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} title="Xóa bài kiểm tra?" description="Lịch sử làm bài của học viên cũng bị xóa."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => setDeleteId(null)}>Huỷ</Button><Button type="button" variant="destructive" loading={pending} onClick={() => void removePaper()}>Xóa</Button></div></Dialog>
  </div>;
}
