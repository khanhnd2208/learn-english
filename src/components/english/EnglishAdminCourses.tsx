'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { AdminCoursesData } from '@/services/english/enCourseService';

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
    </CardContent></Card>)}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}
