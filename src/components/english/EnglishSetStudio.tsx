'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import ProgressBar from '@/components/ui/ProgressBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import EnglishPractice from '@/components/english/EnglishPractice';
import EnglishWordCard from '@/components/english/EnglishWordCard';
import EnrollButton from '@/components/english/EnrollButton';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';
import type { SenseBundle } from '@/lib/english/senseBundle';
import { isLongTerm, stageOf, type LearningStage } from '@/lib/english/schedule';

const VALID_TABS = new Set(['read', 'practice']);

const STAGE_BADGE: Record<LearningStage, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
	new: { label: 'Chưa học', variant: 'default' },
	learning: { label: 'Mới học', variant: 'warning' },
	remembering: { label: 'Đang nhớ', variant: 'accent' },
	long_term: { label: 'Nhớ lâu', variant: 'success' },
};

export default function EnglishSetStudio({ detail }: { detail: EnglishSetDetail }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const requested = searchParams.get('tab');
	const [tab, setTab] = useState(VALID_TABS.has(requested ?? '') ? requested! : 'read');
	const [running, setRunning] = useState(false);
	const wasRunning = useRef(false);
	const [hidden, setHidden] = useState(false);
	const [openIds, setOpenIds] = useState<string[]>([]);
	const [filter, setFilter] = useState<'all' | 'unlearned' | 'lapsed'>('all');
	const [card, setCard] = useState<SenseBundle | null>(null);

	useEffect(() => {
		if (!running) return;
		const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
		window.addEventListener('beforeunload', beforeUnload);
		return () => window.removeEventListener('beforeunload', beforeUnload);
	}, [running]);

	function changeTab(next: string) {
		if (!VALID_TABS.has(next)) return;
		setTab(next);
		const params = new URLSearchParams(searchParams.toString()); params.set('tab', next);
		router.replace(`/sets/${detail.id}?${params}`, { scroll: false });
	}

	function runningChanged(value: boolean) {
		setRunning(value);
		if (wasRunning.current && !value) router.refresh();
		wasRunning.current = value;
	}

	function exitFocus() {
		if (!window.confirm('Thoát phiên luyện? Phần đã luyện sẽ được lưu.')) return;
		setRunning(false); wasRunning.current = false; changeTab('read');
	}

	const visibleWords = detail.words.filter((word) => filter === 'all' || (filter === 'unlearned' ? word.box === 0 : word.lapses > 0 && word.box <= 2));
	const learned = detail.words.filter((word) => word.box >= 1).length;
	const longTerm = detail.words.filter((word) => isLongTerm(word.box)).length;
	const statusBadge = (box: number) => { const badge = STAGE_BADGE[stageOf(box)]; return <Badge variant={badge.variant}>{badge.label}</Badge>; };

	return <div className={`mx-auto px-4 py-8 ${running ? 'max-w-2xl' : 'max-w-3xl'} space-y-6`}>
		{running ? <div className="flex items-center justify-between border-b border-border pb-4"><p className="font-black">Luyện tự do · {detail.title}</p><Button variant="secondary" onClick={exitFocus}>Thoát</Button></div> : <header className="space-y-3">
			<Link href="/sets" className="text-sm font-bold text-accent">← Bộ từ</Link>
			<div><h1 className="text-3xl font-black text-foreground">{detail.title}</h1>{detail.description && <p className="mt-2 text-sm text-muted">{detail.description}</p>}</div>
			<div className="space-y-2"><ProgressBar value={learned} max={Math.max(1, detail.wordCount)} /><p className="text-sm text-muted">{learned}/{detail.wordCount} đã học · {longTerm} nhớ lâu. Từ mới được đưa vào Hôm nay theo thứ tự bên dưới.</p></div>
		</header>}
		{!detail.enrolled && !running && <div className="flex flex-col justify-between gap-3 rounded-card border border-accent/30 bg-accent-subtle p-4 sm:flex-row sm:items-center"><div><p className="font-black">Theo học bộ này để bắt đầu</p><p className="text-sm text-muted">Bạn vẫn có thể đọc trước toàn bộ từ.</p></div><EnrollButton setId={detail.id} enrolled={false} /></div>}
		<Tabs value={tab} onValueChange={changeTab}>
			{!running && <TabsList><TabsTrigger value="read">Danh sách từ</TabsTrigger><TabsTrigger value="practice">Luyện tự do</TabsTrigger></TabsList>}
			<TabsContent value="read"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{([['all', 'Tất cả'], ['unlearned', 'Chưa học'], ['lapsed', 'Hay quên']] as const).map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? 'primary' : 'secondary'} onClick={() => setFilter(value)}>{label}</Button>)}</div><div className="flex gap-2"><Button size="sm" variant="tertiary" onClick={() => { setHidden((value) => !value); setOpenIds([]); }}>{hidden ? 'Hiện nghĩa' : 'Che nghĩa'}</Button>{hidden && <Button size="sm" variant="secondary" onClick={() => setOpenIds(detail.words.map((word) => word.bundle.sense.id))}>Lật hết</Button>}</div></div>
				<ul className="divide-y divide-border overflow-hidden rounded-card border border-border">{visibleWords.map((word) => { const shown = !hidden || openIds.includes(word.bundle.sense.id); return <li key={word.bundle.sense.id}><button type="button" className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover" onClick={() => { if (hidden && !shown) { setOpenIds((ids) => [...ids, word.bundle.sense.id]); return; } setCard(word.bundle); }}><span><span className="block text-lg font-black">{word.bundle.word.lemma}</span><span className="block text-xs text-muted">{word.bundle.word.ipa}</span><span className="mt-1 flex gap-1">{statusBadge(word.box)}{word.lapses > 0 && word.box <= 2 && <Badge variant="warning">Hay quên</Badge>}</span></span><span className="max-w-[55%] text-right text-sm text-foreground-secondary">{shown ? word.bundle.sense.meaningVi : '••••'}</span></button></li>; })}</ul>
			</TabsContent>
			<TabsContent value="practice">{detail.enrolled ? <EnglishPractice mode="set" setId={detail.id} activities={detail.activities} onRunningChange={runningChanged} onNavigateTab={changeTab} /> : <p className="text-sm text-muted">Theo học bộ này trước khi luyện.</p>}</TabsContent>
			
		</Tabs>
		<Dialog open={card !== null} onClose={() => setCard(null)} title={card?.word.lemma ?? 'Từ'}>{card && <EnglishWordCard bundle={card} />}</Dialog>
	</div>;
}
