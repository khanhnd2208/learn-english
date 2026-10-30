'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import MaterialIcon from '@/components/ui/MaterialIcon';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import { filterSetWords, partOfSpeechLabel, type SetWordList } from '@/lib/english/setWordList';

export default function SetWordListDialog({ set, onClose }: { set: { id: string; title: string } | null; onClose: () => void }) {
 const [data, setData] = useState<SetWordList | null>(null);
 const [error, setError] = useState('');
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(1);
 const request = useRef(0);
 const close = useCallback(() => { request.current++; onClose(); }, [onClose]);
 const load = useCallback((id: string, signal: AbortSignal) => {
  const current = ++request.current;
  setData(null); setError('');
  fetch(`/api/review/sets/${encodeURIComponent(id)}/words`, { signal }).then(async (response) => {
   if (!response.ok) throw new Error(response.status === 404 ? 'Bộ từ này không còn khả dụng.' : 'Không tải được danh sách từ. Hãy thử lại.');
   const result = await response.json();
   if (current === request.current) setData(result.data as SetWordList);
  }).catch((cause) => { if (current === request.current && !signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách từ. Hãy thử lại.'); });
 }, []);
 useEffect(() => {
  if (!set) return;
  const controller = new AbortController();
  void Promise.resolve().then(() => { if (!controller.signal.aborted) load(set.id, controller.signal); });
  return () => { controller.abort(); };
 }, [set, load]);
 const filtered = useMemo(() => filterSetWords(data?.words ?? [], search), [data, search]);
 const totalPages = Math.max(1, Math.ceil(filtered.length / 30));
 const visible = filtered.slice((page - 1) * 30, page * 30);
 return <Dialog open={Boolean(set)} onClose={close} title={set?.title ?? ''} description={data ? `${data.words.length} từ` : undefined} className="flex max-h-[90dvh] max-w-xl flex-col p-4 sm:p-6">
  {data && data.words.length > 0 && <div className="shrink-0">
   <div className="relative"><MaterialIcon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input type="search" value={search} aria-label="Tìm từ hoặc nghĩa" placeholder="Tìm từ hoặc nghĩa…" className="h-11 pl-9" onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
   {search.trim() && filtered.length > 0 && <p className="mt-2 text-xs text-muted">{filtered.length} kết quả</p>}
  </div>}
  <div key={page} className="-mx-4 mt-2 min-h-0 flex-1 overflow-y-auto px-4 sm:-mx-6 sm:px-6">
   {!data && !error && <p role="status" className="py-6 text-center text-sm text-muted">Đang tải danh sách từ…</p>}
   {error && <div role="alert" className="py-4 text-center text-sm text-error"><p>{error}</p><button type="button" className="mt-2 inline-flex min-h-11 items-center rounded-control border border-border px-4 font-bold text-foreground" onClick={() => { if (set) load(set.id, new AbortController().signal); }}>Thử lại</button></div>}
   {data && (data.words.length === 0 ? <p className="py-6 text-center text-sm text-muted">Bộ này chưa có từ để hiển thị.</p> : filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted">Không tìm thấy từ phù hợp.</p> : <ul className="divide-y divide-border">{visible.map((word) => <li key={word.senseId} className="flex items-center gap-3 py-3">
    <div className="min-w-0 flex-1">
     <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="break-words text-base font-bold text-foreground sm:text-lg">{word.lemma}</span>{word.ipa.trim() && <span className="font-mono text-xs text-muted">{word.ipa}</span>}</p>
     <p className="mt-0.5 text-sm text-foreground-secondary"><span className="mr-1.5 inline-block rounded-full bg-accent-subtle px-2 py-px align-middle text-[11px] font-bold text-accent">{partOfSpeechLabel(word.partOfSpeech)}</span>{word.meaningVi}</p>
    </div>
    <EnglishAudioButton compact senseId={word.senseId} lemma={word.lemma} recordedAudioAvailable={word.recordedAudioAvailable} />
   </li>)}</ul>)}
  </div>
  {data && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="shrink-0 border-t border-border pt-3" />}
 </Dialog>;
}
