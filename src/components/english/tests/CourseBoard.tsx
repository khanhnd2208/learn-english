'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import CourseAdminControls from '@/components/english/tests/CourseAdminControls';
import PaperCard, { type PaperCardData } from '@/components/english/tests/PaperCard';
import type { AdminTestSubject } from '@/services/english/enTestSubjectService';

interface Column { id: string; title: string; status: string; listed: boolean; accessCode: string | null; learners: number; papers: PaperCardData[] }
const COLUMN_PREFIX = 'col:';
const toColumns = (subjects: AdminTestSubject[]): Column[] => subjects.map((subject) => ({
  id: subject.id, title: subject.title, status: subject.status, listed: subject.listed, accessCode: subject.accessCode ?? null, learners: subject.learners ?? 0,
  papers: subject.papersList.map((paper) => ({ id: paper.id, title: paper.title, questionCount: paper.questionCount, status: paper.status })),
}));
const findColumn = (columns: Column[], id: string) => columns.find((column) => `${COLUMN_PREFIX}${column.id}` === id || column.papers.some((paper) => paper.id === id));
const statusLabel = (status: string) => status === 'draft' ? 'Nháp' : status === 'suspended' ? 'Tạm dừng' : 'Đã xuất bản';

function SortablePaper({ paper, index, count, busy, onMove }: { paper: PaperCardData; index: number; count: number; busy: boolean; onMove: (direction: -1 | 1) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: paper.id });
  const handle = <button type="button" aria-label="Kéo để sắp xếp" className="hidden size-8 cursor-grab touch-none items-center justify-center rounded-control text-muted hover:bg-surface-hover active:cursor-grabbing md:inline-flex" {...attributes} {...listeners}><span aria-hidden="true">⠿</span></button>;
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'opacity-60' : undefined}>
    <PaperCard paper={paper} handle={handle} onMove={onMove} first={index === 0} last={index === count - 1} busy={busy} />
  </li>;
}

function ColumnView({ column, busy, onMove }: { column: Column; busy: boolean; onMove: (paperId: string, direction: -1 | 1) => void }) {
  const { setNodeRef } = useDroppable({ id: `${COLUMN_PREFIX}${column.id}` });
  return <Card><CardContent className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="min-w-0 truncate text-lg font-bold">{column.title}</h2><span className="rounded-full bg-surface-container px-2 py-1 text-xs font-bold">{statusLabel(column.status)}</span></div>
    {(column.papers.length > 0 || column.learners > 0) && <p className="text-xs text-muted">{[column.papers.length > 0 ? `${column.papers.length} bài kiểm tra` : '', column.learners > 0 ? `${column.learners} học viên` : ''].filter(Boolean).join(' · ')}</p>}
    <SortableContext items={column.papers.map((paper) => paper.id)} strategy={verticalListSortingStrategy}>
      <ul ref={setNodeRef} className="min-h-12 space-y-1.5">
        {column.papers.map((paper, index) => <SortablePaper key={paper.id} paper={paper} index={index} count={column.papers.length} busy={busy} onMove={(direction) => onMove(paper.id, direction)} />)}
        {column.papers.length === 0 && <li className="rounded-control border border-dashed border-border px-3 py-3 text-center text-sm text-muted">Kéo đề vào đây</li>}
      </ul>
    </SortableContext>
    <details className="border-t border-border pt-2"><summary className="min-h-10 cursor-pointer text-sm font-bold text-accent">Cài đặt khóa học</summary><CourseAdminControls apiUrl={`/api/admin/tests/subjects/${column.id}`} title={column.title} status={column.status} listed={column.listed} accessCode={column.accessCode} /></details>
  </CardContent></Card>;
}

function Board({ subjects }: { subjects: AdminTestSubject[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [columns, setColumns] = useState(() => toColumns(subjects));
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(columns);
  const snapshot = useRef<Column[] | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const update = (next: Column[]) => { latest.current = next; setColumns(next); };

  async function persist(next: Column[], before: Column[]) {
    const changed = next.filter((column) => column.papers.map((paper) => paper.id).join() !== before.find((old) => old.id === column.id)?.papers.map((paper) => paper.id).join());
    if (!changed.length) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/tests/papers/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ columns: changed.map((column) => ({ subjectId: column.id, paperIds: column.papers.map((paper) => paper.id) })) }) });
      const body = await response.json() as { ok?: boolean };
      if (!response.ok || !body.ok) throw new Error('reorder failed');
      router.refresh();
    } catch { update(before); toast('Không lưu được thứ tự. Đã khôi phục.', 'error'); }
    finally { setBusy(false); }
  }

  function onDragStart() { snapshot.current = latest.current; }
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const current = latest.current;
    const from = findColumn(current, String(active.id));
    const to = findColumn(current, String(over.id));
    if (!from || !to || from.id === to.id) return;
    const moving = from.papers.find((paper) => paper.id === active.id)!;
    const overIndex = to.papers.findIndex((paper) => paper.id === over.id);
    const insertAt = overIndex < 0 ? to.papers.length : overIndex;
    update(current.map((column) => column.id === from.id ? { ...column, papers: column.papers.filter((paper) => paper.id !== active.id) }
      : column.id === to.id ? { ...column, papers: [...column.papers.slice(0, insertAt), moving, ...column.papers.slice(insertAt)] } : column));
  }
  function onDragEnd({ active, over }: DragEndEvent) {
    const before = snapshot.current ?? latest.current;
    snapshot.current = null;
    let next = latest.current;
    if (over) {
      const column = findColumn(next, String(active.id));
      const oldIndex = column?.papers.findIndex((paper) => paper.id === active.id) ?? -1;
      const newIndex = column?.papers.findIndex((paper) => paper.id === over.id) ?? -1;
      if (column && oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) next = next.map((item) => item.id === column.id ? { ...item, papers: arrayMove(item.papers, oldIndex, newIndex) } : item);
    }
    update(next);
    void persist(next, before);
  }
  function onMove(paperId: string, direction: -1 | 1) {
    const before = latest.current;
    const column = findColumn(before, paperId);
    const index = column?.papers.findIndex((paper) => paper.id === paperId) ?? -1;
    if (!column || index + direction < 0 || index + direction >= column.papers.length) return;
    const next = before.map((item) => item.id === column.id ? { ...item, papers: arrayMove(item.papers, index, index + direction) } : item);
    update(next);
    void persist(next, before);
  }
  async function create() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/admin/tests/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description }) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Dữ liệu khóa học không hợp lệ');
      setTitle(''); setDescription(''); toast('Đã tạo khóa học.', 'success'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dữ liệu khóa học không hợp lệ'); }
    finally { setPending(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <h1 className="text-3xl">Khóa học</h1>
    <Card><CardContent className="space-y-3"><h2 className="text-xl font-bold">Tạo khóa học</h2><label className="block text-sm font-bold">Tên khóa học<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label><label className="block text-sm font-bold">Mô tả<textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-surface p-3 font-normal" /></label><Button type="button" disabled={!title.trim() || pending} onClick={() => void create()}>Tạo khóa học</Button>{error && <p role="alert" className="text-sm text-error">{error}</p>}</CardContent></Card>
    {columns.length === 0 ? <p className="text-sm text-muted">Chưa có khóa học. Tạo khóa đầu tiên ở trên.</p>
      : <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{columns.map((column) => <ColumnView key={column.id} column={column} busy={busy} onMove={onMove} />)}</div>
      </DndContext>}
  </div>;
}

/** Remounts when the server data changes shape, so the optimistic copy never goes stale. */
export default function CourseBoard({ subjects }: { subjects: AdminTestSubject[] }) {
  const signature = subjects.map((subject) => `${subject.id}:${subject.status}:${subject.listed}:${subject.accessCode ?? ''}:${subject.papersList.map((paper) => `${paper.id}.${paper.status}`).join(',')}`).join('|');
  return <Board key={signature} subjects={subjects} />;
}
