'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Sheet from '@/components/ui/Sheet';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import EnglishWordCard from '@/components/english/EnglishWordCard';
import EnrollButton from '@/components/english/EnrollButton';
import PublishSetButton from '@/components/english/PublishSetButton';
import { englishSend } from '@/components/english/englishApi';
import { isLongTerm, stageOf } from '@/lib/english/schedule';
import { STAGE_META } from '@/lib/english/stageMeta';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';
type Filter = 'all' | 'new' | 'weak';
const FILTERS: Array<[Filter, string]> = [['all', 'Tất cả'], ['new', 'Chưa ôn'], ['weak', 'Hay quên']];
export default function SetWordsSheet({ setId, title, open, onClose, footer, preview = false, isAdmin = false }: { setId: string; title: string; open: boolean; onClose: () => void; footer?: (detail: EnglishSetDetail) => ReactNode; preview?: boolean; isAdmin?: boolean }) {
 const [cache, setCache] = useState<Record<string, EnglishSetDetail>>({});
 const [error, setError] = useState('');
 const [search, setSearch] = useState('');
 const [filter, setFilter] = useState<Filter>('all');
 const [hideMeaning, setHideMeaning] = useState(false);
 const [selected, setSelected] = useState<string | null>(null);
 const detail = cache[setId];
 useEffect(() => {
  if (!open || !setId || detail) return;
  let active = true;
  englishSend<EnglishSetDetail>(`/api/sets/${encodeURIComponent(setId)}`, 'GET').then(result => { if (active) { setCache(current => ({ ...current, [setId]: result })); setError(''); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được bộ từ.'); });
  return () => { active = false; };
 }, [open, setId, detail]);
 const words = useMemo(() => {
  const query = search.trim().toLocaleLowerCase('vi');
  return (detail?.words ?? []).filter(word => {
   if (filter === 'new' && word.box !== 0) return false;
   if (filter === 'weak' && !(word.lapses > 0 && word.box <= 2)) return false;
   return !query || `${word.bundle.word.lemma} ${word.bundle.sense.meaningVi}`.toLocaleLowerCase('vi').includes(query);
  });
 }, [detail, filter, search]);
 const selectedWord = detail?.words.find(word => word.bundle.sense.id === selected);
 const learned = detail?.words.filter(word => word.box > 0).length ?? 0;
 const longTerm = detail?.words.filter(word => isLongTerm(word.box)).length ?? 0;
 const percent = (count: number) => `${detail?.wordCount ? count / detail.wordCount * 100 : 0}%`;
 const close = () => { setSelected(null); setSearch(''); setFilter('all'); setHideMeaning(false); setError(''); onClose(); };
 return <Sheet open={open} onClose={close} title={title} className="md:max-w-xl max-h-[88dvh] flex flex-col">
 {!detail ? error ? <p role="alert" className="text-error">{error}</p> : <div role="status" aria-label="Đang tải danh sách từ" className="space-y-3 animate-pulse"><div className="h-10 rounded-control bg-surface-container" /><div className="h-16 rounded-control bg-surface-container" /><div className="h-16 rounded-control bg-surface-container" /></div> : <>
 <div className="min-h-0 flex-1 overflow-y-auto space-y-4">
 {selectedWord ? <><button type="button" onClick={() => setSelected(null)} className="min-h-11 font-bold text-accent">← Danh sách</button><EnglishWordCard bundle={selectedWord.bundle} /></> : <>
 {!preview && <div><p className="text-sm text-muted">{learned}/{detail.wordCount} từ đã học · {longTerm} nhớ lâu</p><div className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-container" role="img" aria-label={`${learned} đã ôn, ${longTerm} nhớ lâu trên ${detail.wordCount} từ`}><div className="absolute inset-y-0 left-0 rounded-full bg-accent/40" style={{ width: percent(learned) }} /><div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: percent(longTerm) }} /></div></div>}
 {detail.previewOnly && <p className="rounded-panel border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-foreground-secondary">🔒 Đang xem <strong>{detail.words.length}/{detail.wordCount}</strong> từ mẫu. Nhập mật khẩu để tải cả bộ.</p>}
		<section className="space-y-3">
			<div className="flex items-center justify-between gap-3"><h2 className="text-xl sm:text-2xl">Danh sách từ <span className="text-sm font-normal text-muted sm:text-base">({words.length})</span></h2></div>
			<div className="space-y-2 sm:flex sm:flex-wrap sm:gap-2 sm:space-y-0">
				<input type="search" aria-label="Tìm từ" placeholder="Tìm từ hoặc nghĩa…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm outline-none focus:border-accent sm:min-w-48 sm:flex-1" />
				<div className="flex items-center gap-2">
					{!preview && detail.enrolled && <div className="flex min-w-0 flex-1 gap-0.5 rounded-control border border-border bg-surface p-1 sm:flex-initial sm:gap-1" role="group" aria-label="Lọc từ">
						{FILTERS.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 flex-1 rounded-control px-2 text-xs font-bold sm:flex-initial sm:px-3 sm:text-sm ${filter === value ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'}`}>{label}</button>)}
					</div>}
					<button type="button" aria-pressed={hideMeaning} onClick={() => setHideMeaning(!hideMeaning)} className="min-h-11 shrink-0 rounded-control border border-border bg-surface px-2.5 text-xs font-bold sm:px-3 sm:text-sm">{hideMeaning ? 'Hiện nghĩa' : 'Che nghĩa'}</button>
				</div>
			</div>
			<ul className="space-y-2">
				{words.map((word) => {
					const stage = STAGE_META[stageOf(word.box)];
					const audio = Boolean(word.bundle.word.audioPath);
					return <li key={word.bundle.sense.id} className="word-row">
						<button type="button" onClick={() => setSelected(word.bundle.sense.id)} className="min-h-11 min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-accent">
							<span className="font-bold">{word.bundle.word.lemma}</span>{' '}
							<span className="text-xs text-muted">{word.bundle.word.ipa}{word.bundle.sense.partOfSpeech && ` · ${word.bundle.sense.partOfSpeech}`}</span>
							<span className="block text-sm text-muted">{hideMeaning ? '••••••' : word.bundle.sense.meaningVi}</span>
						</button>
						{word.box > 0 && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold sm:text-xs ${stage.className}`}>{stage.label}</span>}
						<EnglishAudioButton compact senseId={word.bundle.sense.id} lemma={word.bundle.word.lemma} recordedAudioAvailable={audio} />
					</li>;
				})}
				{words.length === 0 && <li className="rounded-panel border border-border bg-surface p-6 text-center text-muted">Không có từ nào khớp.</li>}
			</ul>
		</section>

 </>}</div>
 {!selectedWord && <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">{preview ? detail.enrolled ? <span className="text-sm font-bold text-success">Đã tải ✓</span> : detail.status === 'draft' ? isAdmin && <PublishSetButton setId={detail.id} /> : <EnrollButton setId={detail.id} enrolled={false} locked={detail.locked} /> : footer?.(detail)}</div>}
 </>}</Sheet>;
}
