'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { EmptyState, ListRow, MaterialIcon, PageHeader } from '@/components/ui';
import type { VocabSubjectSummary } from '@/services/english/enVocabSubjectService';

export default function Library({ subjects, isAdmin }: { subjects: VocabSubjectSummary[]; isAdmin: boolean }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => subjects.filter((subject) => `${subject.title} ${subject.description}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [subjects, search]);
  const groups = [{ label: 'Môn của bạn', rows: filtered.filter((subject) => subject.enrolled) }, { label: 'Khám phá', rows: filtered.filter((subject) => !subject.enrolled) }];
  return <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <PageHeader title="Cửa hàng" action={isAdmin && <Link href="/admin" className="inline-flex min-h-11 shrink-0 items-center rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground">+ Thêm môn học</Link>} />
    {subjects.length > 8 && <input type="search" aria-label="Tìm môn học…" placeholder="Tìm môn học…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-control border border-border bg-surface px-3 sm:max-w-md" />}
    {!filtered.length ? <EmptyState icon="library_books" title={subjects.length ? 'Không tìm thấy môn học' : 'Chưa có môn học'} /> : groups.filter((group) => group.rows.length).map((group) => <section key={group.label} className="space-y-3"><h2 className="text-xl font-bold">{group.label}</h2><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.rows.map((subject) => <ListRow key={subject.id} href={`/subjects/${subject.id}`} title={subject.title} meta={subject.status !== 'published' ? 'Bản nháp' : subject.sets > 0 ? `${subject.sets} bộ · ${subject.words} từ` : 'Chưa có bộ từ'} trailing={subject.locked ? <span aria-label="Cần mật khẩu"><MaterialIcon name="lock" className="text-muted" /></span> : undefined} />)}</ul></section>)}
  </div>;
}
