'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import SetWordsSheet from '@/components/english/SetWordsSheet';
import EnrollButton from '@/components/english/EnrollButton';
import StoreAdminControls from '@/components/english/StoreAdminControls';
import type { EnglishSetSummary } from '@/services/english/enCatalogService';

export default function Library({ sets, isAdmin }: { sets: EnglishSetSummary[]; isAdmin: boolean }) {
 const [viewSetId, setViewSetId] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const filtered = useMemo(() => sets.filter((set) => `${set.title} ${set.description}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [sets, search]);
 return <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl">Thư viện</h1><p className="mt-1 text-sm text-muted">{isAdmin ? 'Bộ nháp và bộ ẩn cũng hiện với quyền quản trị.' : 'Tìm và chọn bộ từ phù hợp với bạn.'}</p></div>{isAdmin && <Link href="/admin" className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground">+ Thêm bộ</Link>}</header>
  <div className="flex flex-wrap gap-2"><input type="search" aria-label="Tìm bộ từ" placeholder="Tìm bộ từ…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 min-w-48 flex-1 rounded-control border border-border bg-surface px-3" /></div>
  {!filtered.length ? <EmptyState icon="library_books" title={sets.length ? 'Không tìm thấy bộ phù hợp' : 'Chưa có bộ từ'} description={sets.length ? 'Thử từ khóa hoặc bộ lọc khác.' : 'Các bộ từ sẽ xuất hiện khi được xuất bản.'} /> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((set) => <li key={set.id} className="flex flex-col rounded-panel border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><h2 className="text-base font-bold">{set.title}</h2><span className="shrink-0 rounded-full bg-surface-container px-2 py-1 text-xs font-bold">{set.words} từ</span></div>{set.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{set.description}</p>}<p className="mt-2 text-xs text-muted">{set.locked ? 'Cần mật khẩu' : ''}</p><div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3"><button type="button" onClick={() => setViewSetId(set.id)} className="inline-flex min-h-11 items-center font-bold text-accent">{set.enrolled ? 'Mở bộ →' : 'Xem trước →'}</button>{set.enrolled ? <span className="text-sm font-bold text-success">Đã tải ✓</span> : set.status === 'published' ? <EnrollButton setId={set.id} enrolled={false} locked={set.locked} /> : <span className="text-xs text-muted">Bản nháp</span>}</div>{isAdmin && <StoreAdminControls setId={set.id} title={set.title} status={set.status} listed={set.listed} accessCode={set.accessCode ?? null} learners={set.learners ?? 0} />}</li>)}</ul>}
  <SetWordsSheet setId={viewSetId ?? ''} title={sets.find(set => set.id === viewSetId)?.title ?? 'Bộ từ'} open={Boolean(viewSetId)} onClose={() => setViewSetId(null)} preview isAdmin={isAdmin} />
 </div>;
}
