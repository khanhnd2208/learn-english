'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import type { AdminCourse, AdminCoursesData } from '@/services/english/enCourseService';
import type { ExamQuestionInput, ExamParseIssue } from '@/lib/english/exam';

const SAMPLE_EXAM = `Câu 1: She ___ to school every day.
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

function ExamAdminSection({ course }: { course: AdminCourse }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [setId, setSetId] = useState('');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ questions: ExamQuestionInput[]; issues: ExamParseIssue[] } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  async function api(path: string, method: string, data?: object) {
    const response = await fetch(path, { method, ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
    const body = await response.json() as { ok?: boolean; error?: string; data?: unknown };
    if (!response.ok || !body.ok) throw new Error(body.error ?? 'Dữ liệu đề không hợp lệ');
    return body.data;
  }
  function newExam() { setEditing(null); setTitle(''); setDescription(''); setSetId(''); setText(''); setPreview(null); setError(''); setOpen(true); }
  async function editExam(id: string) {
    setPending(true); setError('');
    try {
      const data = await api(`/api/admin/exams/${id}`, 'GET') as { title: string; description: string; setId: string | null; text: string };
      setEditing(id); setTitle(data.title); setDescription(data.description); setSetId(data.setId ?? ''); setText(data.text); setPreview(null); setOpen(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tìm thấy bài kiểm tra'); }
    finally { setPending(false); }
  }
  async function previewText() {
    setPending(true); setError('');
    try { setPreview(await api('/api/admin/exams', 'POST', { action: 'preview', text }) as { questions: ExamQuestionInput[]; issues: ExamParseIssue[] }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Dữ liệu đề không hợp lệ'); }
    finally { setPending(false); }
  }
  async function save(publish: boolean) {
    setPending(true); setError('');
    try {
      await api('/api/admin/exams', 'POST', { action: 'save', courseId: course.id, setId: setId || null, title, description, text, publish, ...(editing ? { examId: editing } : {}) });
      toast(publish ? 'Đã lưu và xuất bản.' : 'Đã lưu bản nháp.', 'success'); setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Đề còn lỗi, hãy sửa rồi lưu lại.'); }
    finally { setPending(false); }
  }
  async function changeStatus(id: string, status: 'draft' | 'published') {
    setPending(true); setError('');
    try { await api(`/api/admin/exams/${id}`, 'PATCH', { status }); if (status === 'draft') toast('Đã ẩn bài kiểm tra.', 'success'); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tìm thấy bài kiểm tra'); }
    finally { setPending(false); }
  }
  async function removeExam() {
    if (!deleteId) return;
    setPending(true); setError('');
    try { await api(`/api/admin/exams/${deleteId}`, 'DELETE'); toast('Đã xóa bài kiểm tra.', 'success'); setDeleteId(null); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tìm thấy bài kiểm tra'); }
    finally { setPending(false); }
  }
  const canSave = title.trim() && text.trim() && !pending && !preview?.issues.length;
  return <section className="space-y-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Bài kiểm tra</h3><Button type="button" size="sm" disabled={pending} onClick={newExam}>+ Thêm bài kiểm tra</Button></div>
    {course.examsList.length ? <ul className="divide-y divide-border">{course.examsList.map((exam) => <li key={exam.id} className="flex flex-wrap items-center gap-2 py-2"><div className="min-w-0 flex-1"><p className="truncate font-bold">{exam.title}</p><p className="text-xs text-muted">{exam.lessonTitle ?? 'Ôn tổng hợp'} · {exam.questionCount} câu · {exam.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</p></div><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void editExam(exam.id)}>Sửa</Button><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void changeStatus(exam.id, exam.status === 'published' ? 'draft' : 'published')}>{exam.status === 'published' ? 'Ẩn' : 'Xuất bản'}</Button><Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setDeleteId(exam.id)}>Xóa</Button></li>)}</ul> : <p className="text-sm text-muted">Chưa có bài kiểm tra.</p>}
    {open && <div className="space-y-3 border-t border-border pt-3"><label className="block text-sm font-bold">Tên đề<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label><label className="block text-sm font-bold">Thuộc bài<select value={setId} onChange={(event) => setSetId(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal"><option value="">Ôn tổng hợp</option>{course.lessonsList.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label><label className="block text-sm font-bold">Mô tả<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-surface p-3 font-normal" /></label><label className="block text-sm font-bold">Nội dung đề<textarea value={text} onChange={(event) => { setText(event.target.value); setPreview(null); }} className="mt-1 min-h-64 w-full rounded-control border border-border bg-surface p-3 font-mono text-sm font-normal" /></label><p className="text-xs text-muted">Mỗi câu bắt đầu bằng &quot;Câu 1:&quot;. Trắc nghiệm: A. B. C., đánh dấu * trước đáp án đúng. Điền từ: viết ___ ở chỗ trống và thêm dòng &quot;Đáp án:&quot;. Có thể thêm dòng &quot;Giải thích:&quot;.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="tertiary" disabled={pending} onClick={() => { setText(SAMPLE_EXAM); setPreview(null); }}>Điền mẫu</Button><Button type="button" variant="secondary" disabled={pending || !text.trim()} onClick={() => void previewText()}>Xem trước</Button><Button type="button" variant="secondary" disabled={!canSave} onClick={() => void save(false)}>Lưu nháp</Button><Button type="button" disabled={!canSave} onClick={() => void save(true)}>Lưu &amp; xuất bản</Button><Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Huỷ</Button></div>
      {preview && <div className="space-y-2 border-t border-border pt-3"><h4 className="font-bold">Xem trước · {preview.questions.length} câu</h4>{preview.issues.map((issue, index) => <p key={`${issue.line}-${index}`} className="text-sm text-warning">{issue.line > 0 && !issue.message.startsWith('Dòng ') ? `Dòng ${issue.line}: ${issue.message}` : issue.message}</p>)}{preview.questions.map((question, index) => <div key={index} className="text-sm"><p className="font-bold">{index + 1}. {question.prompt}</p><p className="text-xs text-muted">{question.type === 'mcq' ? 'Trắc nghiệm' : 'Điền từ'}</p>{question.type === 'mcq' ? question.options.map((option, i) => <p key={i} className={i === question.correctIndex ? 'font-bold' : ''}>{String.fromCharCode(65 + i)}. {option}</p>) : <p>Đáp án: {question.answers.join(' / ')}</p>}{question.explanationVi && <p>Giải thích: {question.explanationVi}</p>}</div>)}</div>}
    </div>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} title="Xóa bài kiểm tra?" description="Lịch sử làm bài của học viên cũng bị xóa."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => setDeleteId(null)}>Huỷ</Button><Button type="button" variant="destructive" loading={pending} onClick={() => void removeExam()}>Xóa</Button></div></Dialog>
  </section>;
}

export default function EnglishAdminCourses({ data }: { data: AdminCoursesData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  async function request(key: string, path: string, method: 'POST' | 'PATCH', payload: object) {
    setPending(key); setError('');
    try {
      const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không cập nhật được khóa học');
      if (key === 'create') { setTitle(''); setDescription(''); toast('Đã tạo khóa học.', 'success'); }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được khóa học'); }
    finally { setPending(''); }
  }
  return <div className="space-y-4">
    <Card><CardContent className="space-y-3"><h2 className="text-xl font-bold">Tạo khóa học</h2><label className="block text-sm font-bold">Tên khóa học<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label><label className="block text-sm font-bold">Mô tả<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-surface p-3 font-normal" /></label><Button type="button" disabled={!title.trim() || Boolean(pending)} onClick={() => void request('create', '/api/admin/courses', 'POST', { title, description })}>Tạo khóa học</Button></CardContent></Card>
    {data.courses.map((course) => <Card key={course.id}><CardContent className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{course.title}</h2><span className="rounded-full bg-surface-container px-2 py-1 text-xs font-bold">{course.status === 'draft' ? 'Bản nháp' : course.status === 'suspended' ? 'Tạm dừng' : 'Đã xuất bản'}</span></div><p className="text-xs text-muted">{course.lessonsList.length} bài{course.learners ? ` · ${course.learners} học viên` : ''}</p>
      {course.lessonsList.length ? <ul className="divide-y divide-border">{course.lessonsList.map((lesson, index) => <li key={lesson.id} className="flex items-center gap-2 py-2"><span className="min-w-0 flex-1 truncate text-sm">Bài {index + 1} · {lesson.title}{lesson.status === 'draft' ? ' · Bản nháp' : ''}</span><Button type="button" size="sm" variant="ghost" aria-label={`Đưa ${lesson.title} lên`} disabled={Boolean(pending) || index === 0} onClick={() => void request(course.id, `/api/admin/courses/${course.id}`, 'PATCH', { action: 'move', setId: lesson.id, direction: 'up' })}>↑</Button><Button type="button" size="sm" variant="ghost" aria-label={`Đưa ${lesson.title} xuống`} disabled={Boolean(pending) || index === course.lessonsList.length - 1} onClick={() => void request(course.id, `/api/admin/courses/${course.id}`, 'PATCH', { action: 'move', setId: lesson.id, direction: 'down' })}>↓</Button><Button type="button" size="sm" variant="secondary" disabled={Boolean(pending)} onClick={() => void request(course.id, `/api/admin/courses/${course.id}`, 'PATCH', { action: 'removeSet', setId: lesson.id })}>Gỡ</Button></li>)}</ul> : <p className="text-sm text-muted">Chưa có bài. Thêm bài từ danh sách bên dưới.</p>}
      {data.unassignedSets.length > 0 && <div className="flex flex-wrap gap-2"><select aria-label="Chọn bài để thêm" value={selected[course.id] ?? ''} onChange={(event) => setSelected({ ...selected, [course.id]: event.target.value })} className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm"><option value="">Chọn bài chưa xếp khóa…</option>{data.unassignedSets.map((set) => <option key={set.id} value={set.id}>{set.title}</option>)}</select><Button type="button" disabled={Boolean(pending) || !selected[course.id]} onClick={() => void request(course.id, `/api/admin/courses/${course.id}`, 'PATCH', { action: 'addSet', setId: selected[course.id] })}>Thêm bài</Button></div>}
      <ExamAdminSection course={course} />
    </CardContent></Card>)}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}
