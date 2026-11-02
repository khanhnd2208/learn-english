'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import CourseEnrollButton from '@/components/english/CourseEnrollButton';
import CourseAdminControls from '@/components/english/CourseAdminControls';
import type { CourseSummary } from '@/services/english/enCourseService';

export default function Library({ courses, isAdmin }: { courses: CourseSummary[]; isAdmin: boolean }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => courses.filter((course) => `${course.title} ${course.description}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [courses, search]);
  const groups = [{ label: 'Khóa của bạn', rows: filtered.filter((course) => course.enrolled) }, { label: 'Khám phá', rows: filtered.filter((course) => !course.enrolled) }];
  return <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl">Khóa học</h1><p className="mt-1 text-sm text-muted">{isAdmin ? 'Khóa nháp và khóa ẩn cũng hiện với quyền quản trị.' : 'Chọn khóa học phù hợp với bạn.'}</p></div>{isAdmin && <Link href="/admin" className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground">+ Thêm khóa học</Link>}</header>
    <input type="search" aria-label="Tìm khóa học…" placeholder="Tìm khóa học…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-control border border-border bg-surface px-3 sm:max-w-md" />
    {!filtered.length ? <EmptyState icon="library_books" title={courses.length ? 'Không tìm thấy khóa học phù hợp' : 'Chưa có khóa học'} description={courses.length ? 'Thử từ khóa khác.' : 'Các khóa học sẽ xuất hiện khi được xuất bản.'} /> : groups.filter((group) => group.rows.length).map((group) => <section key={group.label} className="space-y-3"><h2 className="text-xl font-bold">{group.label}</h2><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.rows.map((course) => <li key={course.id} className="flex flex-col rounded-panel border border-border bg-surface p-4"><h3 className="text-base font-bold">{course.title}</h3>{course.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{course.description}</p>}<p className="mt-2 text-xs text-muted">{course.lessons} bài · {course.words} từ{course.exams > 0 ? ` · ${course.exams} bài kiểm tra` : ''}</p>{course.locked && <p className="mt-1 text-xs text-muted">Cần mật khẩu</p>}<div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3"><Link href={`/courses/${course.id}`} className="inline-flex min-h-11 items-center font-bold text-accent">{course.enrolled ? 'Vào học →' : 'Xem khóa học →'}</Link>{course.enrolled ? <span className="text-sm font-bold text-success">Đã đăng ký ✓</span> : course.status === 'published' ? <CourseEnrollButton courseId={course.id} locked={course.locked} /> : <span className="text-xs text-muted">Bản nháp</span>}</div>{isAdmin && <CourseAdminControls courseId={course.id} title={course.title} status={course.status} listed={course.listed} accessCode={course.accessCode ?? null} />}</li>)}</ul></section>)}
  </div>;
}
