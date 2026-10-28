'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Dialog from '@/components/ui/Dialog';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import EnglishWordCard from '@/components/english/EnglishWordCard';
import EnrollButton from '@/components/english/EnrollButton';
import RemoveSetButton from '@/components/english/RemoveSetButton';
import { QUIZ_KINDS, QUIZ_META } from '@/lib/english/quiz';
import { isLongTerm, stageOf } from '@/lib/english/schedule';
import { STAGE_META } from '@/lib/english/stageMeta';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';

type Filter = 'all' | 'new' | 'weak';

const FILTERS: Array<[Filter, string]> = [['all', 'Tất cả'], ['new', 'Chưa ôn'], ['weak', 'Hay quên']];

const linkButton = 'inline-flex min-h-11 items-center justify-center rounded-control border border-border px-3 text-center text-sm font-bold hover:border-accent focus-visible:ring-2 focus-visible:ring-accent';

export default function SetDetail({ detail }: { detail: EnglishSetDetail }) {
	const [search, setSearch] = useState('');
	const [practiceOpen, setPracticeOpen] = useState(false);
	const [challengeOpen, setChallengeOpen] = useState(false);
	const [filter, setFilter] = useState<Filter>('all');
	const [hideMeaning, setHideMeaning] = useState(false);
	const [selected, setSelected] = useState<string | null>(null);
	const words = useMemo(() => {
		const query = search.trim().toLocaleLowerCase('vi');
		return detail.words.filter((word) => {
			if (filter === 'new' && word.box !== 0) return false;
			if (filter === 'weak' && !(word.lapses > 0 && word.box <= 2)) return false;
			return !query || `${word.bundle.word.lemma} ${word.bundle.sense.meaningVi}`.toLocaleLowerCase('vi').includes(query);
		});
	}, [detail.words, filter, search]);
	const selectedWord = detail.words.find((word) => word.bundle.sense.id === selected);
	const learned = detail.words.filter((word) => word.box > 0).length;
	const longTerm = detail.words.filter((word) => isLongTerm(word.box)).length;
	const percent = (count: number) => `${detail.wordCount ? (count / detail.wordCount) * 100 : 0}%`;

	return <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
		<Link href={detail.enrolled ? '/sets' : '/store'} className="inline-flex min-h-11 items-center text-sm font-bold text-accent">← {detail.enrolled ? 'Bộ từ' : 'Thư viện'}</Link>
		<header className="mode-card space-y-4">
			<div className="flex items-start justify-between gap-3"><div><h1 className="text-3xl sm:text-4xl">{detail.title}</h1><p className="mt-1 text-sm text-muted">{learned}/{detail.wordCount} từ đã học{longTerm > 0 ? ` · ${longTerm} nhớ lâu` : ''}</p>{detail.description && <p className="mt-2 text-sm text-muted">{detail.description}</p>}</div>{detail.enrolled && <details className="relative"><summary aria-label="Tùy chọn bộ từ" className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-control border border-border text-xl">⋯</summary><div className="absolute right-0 z-20 mt-1 rounded-card border border-border bg-surface p-2 shadow-overlay"><RemoveSetButton setId={detail.id} setTitle={detail.title} locked={detail.locked} listed={detail.listed} /></div></details>}</div>
			<div className="relative h-2 overflow-hidden rounded-full bg-surface-container" role="img" aria-label={`${learned} đã ôn, ${longTerm} nhớ lâu trên ${detail.wordCount} từ`}>
				<div className="absolute inset-y-0 left-0 rounded-full bg-accent/40" style={{ width: percent(learned) }} />
				<div className="absolute inset-y-0 left-0 rounded-full bg-success" style={{ width: percent(longTerm) }} />
			</div>
			{detail.enrolled ? <div className="flex flex-wrap items-center gap-2"><Button size="lg" onClick={() => setPracticeOpen(true)}>Luyện bộ này ▾</Button><Button size="lg" variant="secondary" onClick={() => setChallengeOpen(true)}>Thử thách</Button><InfoHint title={HINTS.practice.title}>{HINTS.practice.body}</InfoHint></div> : <EnrollButton setId={detail.id} enrolled={false} locked={detail.locked} />}
			{detail.previewOnly && <p className="flex items-start gap-2 rounded-panel border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-foreground-secondary"><span aria-hidden="true">🔒</span><span>Đang xem <strong className="tabular-nums">{detail.words.length}/{detail.wordCount}</strong> từ mẫu. Nhập mật khẩu để tải cả bộ.</span></p>}
		</header>

		<Sheet open={practiceOpen} onClose={() => setPracticeOpen(false)} title="Chọn dạng luyện tập"><div className="grid gap-2"><Link href={`/sets/${detail.id}/practice`} className={linkButton}>Trộn các dạng</Link>{QUIZ_KINDS.map((kind) => <Link key={kind} href={`/sets/${detail.id}/practice?type=${kind}`} className={linkButton}>{QUIZ_META[kind].label}</Link>)}</div></Sheet>

		<Sheet open={challengeOpen} onClose={() => setChallengeOpen(false)} title="Chọn dạng thử thách"><div className="grid gap-2">{QUIZ_KINDS.map((kind) => <Link key={kind} href={`/sets/${detail.id}/test?type=${kind}`} className={linkButton}>{QUIZ_META[kind].label}{detail.dailyTasks[kind] && ` ✓ ${detail.dailyTasks[kind]?.passedCount}/${detail.dailyTasks[kind]?.wordCount}`}</Link>)}</div></Sheet>

		<section className="space-y-3">
			<div className="flex items-center justify-between gap-3"><h2 className="text-2xl">Danh sách từ <span className="text-base font-normal text-muted">({words.length})</span></h2></div>
			<div className="flex flex-wrap gap-2">
				<input type="search" aria-label="Tìm từ" placeholder="Tìm từ hoặc nghĩa…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 min-w-48 flex-1 rounded-control border border-border bg-surface px-3 outline-none focus:border-accent" />
				{detail.enrolled && <div className="flex gap-1 rounded-control border border-border bg-surface p-1" role="group" aria-label="Lọc từ">
					{FILTERS.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 rounded-control px-3 text-sm font-bold ${filter === value ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'}`}>{label}</button>)}
				</div>}
				<button type="button" aria-pressed={hideMeaning} onClick={() => setHideMeaning(!hideMeaning)} className="min-h-11 rounded-control border border-border px-3 text-sm font-bold">{hideMeaning ? 'Hiện nghĩa' : 'Che nghĩa'}</button>
			</div>
			<ul className="space-y-2">
				{words.map((word) => {
					const stage = STAGE_META[stageOf(word.box)];
					const audio = Boolean(word.bundle.word.audioPath || word.bundle.word.audioUkPath || word.bundle.word.audioUsPath);
					return <li key={word.bundle.sense.id} className="word-row">
						<button type="button" onClick={() => setSelected(word.bundle.sense.id)} className="min-h-11 min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-accent">
							<span className="font-bold">{word.bundle.word.lemma}</span>{' '}
							<span className="text-xs text-muted">{word.bundle.word.ipa}{word.bundle.sense.partOfSpeech && ` · ${word.bundle.sense.partOfSpeech}`}</span>
							<span className="block text-sm text-muted">{hideMeaning ? '••••••' : word.bundle.sense.meaningVi}</span>
						</button>
						<span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${stage.className}`}>{stage.label}</span>
						<EnglishAudioButton compact senseId={word.bundle.sense.id} lemma={word.bundle.word.lemma} recordedAudioAvailable={audio} />
					</li>;
				})}
				{words.length === 0 && <li className="rounded-panel border border-border bg-surface p-6 text-center text-muted">Không có từ nào khớp.</li>}
			</ul>
		</section>

		<Dialog open={Boolean(selectedWord)} onClose={() => setSelected(null)} title={selectedWord?.bundle.word.lemma ?? 'Thẻ từ'} className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
			{selectedWord && <EnglishWordCard bundle={selectedWord.bundle} />}
		</Dialog>
	</div>;
}
