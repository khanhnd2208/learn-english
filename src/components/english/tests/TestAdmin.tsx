'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import SubjectAdminControls from '@/components/english/SubjectAdminControls';
import type { TestImportIssue } from '@/lib/english/testImport';
import type { TestQuestionInput } from '@/lib/english/testPaper';
import type { AdminTestSubject } from '@/services/english/enTestSubjectService';

type Preview = { questions: TestQuestionInput[]; issues: TestImportIssue[] };
const XLSX_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function PaperAdminSection({ subject }: { subject: AdminTestSubject }) {
  const router = useRouter();
  const { toast } = useToast();
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
      data.set('subjectId', subject.id); data.set('title', title); data.set('description', description); data.set('publish', String(publish));
      if (editing) data.set('paperId', editing);
    }
    return data;
  }
  function newPaper() { setEditing(null); setTitle(''); setDescription(''); setFile(null); setPreview(null); setError(''); setOpen(true); }
  function replacePaper(id: string) {
    const paper = subject.papersList.find((row) => row.id === id);
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
  return <section className="space-y-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Bài kiểm tra</h3><Button type="button" size="sm" disabled={pending} onClick={newPaper}>+ Nhập bài kiểm tra</Button></div>
    {subject.papersList.length ? <ul className="divide-y divide-border">{subject.papersList.map((paper) => <li key={paper.id} className="flex flex-wrap items-center gap-2 py-2"><div className="min-w-0 flex-1"><p className="truncate font-bold">{paper.title}</p><p className="text-xs text-muted">{paper.questionCount} câu · {paper.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</p></div><a href={`/api/admin/tests/papers/${paper.id}`} download className="inline-flex min-h-10 items-center rounded-control border border-border px-3 text-xs font-bold">Tải về</a><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => replacePaper(paper.id)}>Thay đề</Button><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void changeStatus(paper.id, paper.status === 'published' ? 'draft' : 'published')}>{paper.status === 'published' ? 'Ẩn' : 'Xuất bản'}</Button><Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setDeleteId(paper.id)}>Xóa</Button></li>)}</ul> : <p className="text-sm text-muted">Chưa có bài kiểm tra.</p>}
    {open && <div className="space-y-3 border-t border-border pt-3">
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
    <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} title="Xóa bài kiểm tra?" description="Lịch sử làm bài của học viên cũng bị xóa."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => setDeleteId(null)}>Huỷ</Button><Button type="button" variant="destructive" loading={pending} onClick={() => void removePaper()}>Xóa</Button></div></Dialog>
  </section>;
}

export default function TestAdmin({ subjects }: { subjects: AdminTestSubject[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function create() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/admin/tests/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description }) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Dữ liệu môn học không hợp lệ');
      setTitle(''); setDescription(''); toast('Đã tạo môn học.', 'success'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dữ liệu môn học không hợp lệ'); }
    finally { setPending(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <h1 className="text-3xl">Quản lý bài kiểm tra</h1>
    <Card><CardContent className="space-y-3"><h2 className="text-xl font-bold">Tạo môn học</h2><label className="block text-sm font-bold">Tên môn học<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label><label className="block text-sm font-bold">Mô tả<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-surface p-3 font-normal" /></label><Button type="button" disabled={!title.trim() || pending} onClick={() => void create()}>Tạo môn học</Button></CardContent></Card>
    {subjects.map((subject) => <Card key={subject.id}><CardContent className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{subject.title}</h2><span className="rounded-full bg-surface-container px-2 py-1 text-xs font-bold">{subject.status === 'draft' ? 'Bản nháp' : subject.status === 'suspended' ? 'Tạm dừng' : 'Đã xuất bản'}</span></div>
      {(subject.papersList.length > 0 || Boolean(subject.learners)) && <p className="text-xs text-muted">{[subject.papersList.length > 0 ? `${subject.papersList.length} bài kiểm tra` : '', subject.learners ? `${subject.learners} học viên` : ''].filter(Boolean).join(' · ')}</p>}
      <SubjectAdminControls apiUrl={`/api/admin/tests/subjects/${subject.id}`} title={subject.title} status={subject.status} listed={subject.listed} accessCode={subject.accessCode ?? null} />
      <PaperAdminSection subject={subject} />
    </CardContent></Card>)}
    {subjects.length === 0 && <p className="text-sm text-muted">Chưa có môn học. Tạo môn đầu tiên ở trên.</p>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}
