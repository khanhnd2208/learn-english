'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import SubjectEnrollButton from '@/components/english/SubjectEnrollButton';
import type { TestSubjectSummary } from '@/services/english/enTestSubjectService';

export default function TestLibrary({ subjects, isAdmin }: { subjects: TestSubjectSummary[]; isAdmin: boolean }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => subjects.filter((subject) => `${subject.title} ${subject.description}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [subjects, search]);
  const groups = [{ label: 'Môn của bạn', rows: filtered.filter((subject) => subject.enrolled) }, { label: 'Khám phá', rows: filtered.filter((subject) => !subject.enrolled) }];
  return <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl">Môn học</h1><p className="mt-1 text-sm text-muted">{isAdmin ? 'Môn nháp và môn ẩn cũng hiện với quyền quản trị.' : 'Chọn môn học để làm bài kiểm tra.'}</p></div>{isAdmin && <Link href="/admin/tests" className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground">+ Thêm môn học</Link>}</header>
    <input type="search" aria-label="Tìm môn học…" placeholder="Tìm môn học…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-control border border-border bg-surface px-3 sm:max-w-md" />
    {!filtered.length ? <EmptyState icon="library_books" title={subjects.length ? 'Không tìm thấy môn học phù hợp' : 'Chưa có môn học'} description={subjects.length ? 'Thử từ khóa khác.' : 'Các môn học sẽ xuất hiện khi được xuất bản.'} /> : groups.filter((group) => group.rows.length).map((group) => <section key={group.label} className="space-y-3"><h2 className="text-xl font-bold">{group.label}</h2><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.rows.map((subject) => <li key={subject.id} className="flex flex-col rounded-panel border border-border bg-surface p-4"><h3 className="text-base font-bold">{subject.title}</h3>{subject.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{subject.description}</p>}<p className="mt-2 text-xs text-muted">{subject.papers > 0 ? `${subject.papers} bài kiểm tra` : 'Chưa có bài kiểm tra'}</p>{subject.locked && <p className="mt-1 text-xs text-muted">Cần mật khẩu</p>}<div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3"><Link href={`/tests/subjects/${subject.id}`} className="inline-flex min-h-11 items-center font-bold text-accent">{subject.enrolled ? 'Vào làm bài →' : 'Xem môn học →'}</Link>{subject.enrolled ? <span className="text-sm font-bold text-success">Đã đăng ký ✓</span> : subject.status === 'published' ? <SubjectEnrollButton enrollUrl={`/api/tests/subjects/${subject.id}/enroll`} href={`/tests/subjects/${subject.id}`} locked={subject.locked} /> : <span className="text-xs text-muted">Bản nháp</span>}</div></li>)}</ul></section>)}
  </div>;
}
