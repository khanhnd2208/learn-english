'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
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
 return <Dialog open={Boolean(set)} onClose={close} title={set?.title ?? ''} description={data ? `${data.words.length} từ` : undefined} className="flex max-h-[90dvh] max-w-xl flex-col">
  <div className="min-h-0 overflow-y-auto">
   {!data && !error && <p role="status" className="text-sm text-muted">Đang tải danh sách từ…</p>}
   {error && <div role="alert" className="text-sm text-error">{error} <button type="button" className="ml-2 font-bold underline" onClick={() => { if (set) load(set.id, new AbortController().signal); }}>Thử lại</button></div>}
   {data && <>
    <Input value={search} aria-label="Tìm từ hoặc nghĩa" placeholder="Tìm từ hoặc nghĩa…" onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    {search.trim() && filtered.length > 0 && <p className="mt-2 text-xs text-muted">{filtered.length} kết quả</p>}
    {data.words.length === 0 ? <p className="mt-4 text-sm text-muted">Bộ này chưa có từ để hiển thị.</p> : filtered.length === 0 ? <p className="mt-4 text-sm text-muted">Không tìm thấy từ phù hợp.</p> : <ul className="mt-3 divide-y divide-border">{visible.map((word) => <li key={word.senseId} className="flex items-start gap-3 py-3"><div className="min-w-0 flex-1"><p className="break-words text-lg font-bold">{word.lemma}</p><p className="text-xs text-muted">{word.ipa.trim() && <span className="mr-2 font-mono">{word.ipa}</span>}{partOfSpeechLabel(word.partOfSpeech)}</p><p className="text-sm text-foreground-secondary">{word.meaningVi}</p></div><EnglishAudioButton compact senseId={word.senseId} lemma={word.lemma} recordedAudioAvailable={word.recordedAudioAvailable} /></li>)}</ul>}
   </>}
  </div>
  {data && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-3 shrink-0" />}
 </Dialog>;
}
