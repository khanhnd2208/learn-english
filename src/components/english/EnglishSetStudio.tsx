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
import EnglishTest from '@/components/english/EnglishTest';
import EnglishTestResult from '@/components/english/EnglishTestResult';
import EnglishWordCard from '@/components/english/EnglishWordCard';
import EnrollButton from '@/components/english/EnrollButton';
import type { EnglishSetDetail } from '@/services/english/enCatalogService';
import type { SenseBundle } from '@/lib/english/senseBundle';
import type { FinishedEnglishTest } from '@/lib/english/testTypes';

const VALID_TABS = new Set(['read', 'practice', 'test', 'result']);

export default function EnglishSetStudio({ detail }: { detail: EnglishSetDetail }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const requested = searchParams.get('tab');
	const [tab, setTab] = useState(VALID_TABS.has(requested ?? '') ? requested! : 'read');
	const [running, setRunning] = useState(false);
	const wasRunning = useRef(false);
	const [hidden, setHidden] = useState(false);
	const [openIds, setOpenIds] = useState<string[]>([]);
	const [filter, setFilter] = useState<'all' | 'unmastered' | 'mistakes'>('all');
	const [card, setCard] = useState<SenseBundle | null>(null);
	const [lastResult, setLastResult] = useState<FinishedEnglishTest | null>(detail.lastAttempt);

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
		if (!window.confirm(tab === 'test' ? 'Thoát bài kiểm tra? Bạn có thể làm tiếp trong vòng 24 giờ.' : 'Thoát phiên luyện? Phần đã luyện sẽ được lưu.')) return;
		setRunning(false); wasRunning.current = false; changeTab('read');
	}

	const visibleWords = detail.words.filter((word) => filter === 'all' || (filter === 'unmastered' ? word.status !== 'mastered' : word.inMistakeBook));
	const statusBadge = (status: string) => status === 'mastered' ? <Badge variant="success">Đã nắm</Badge> : status === 'practicing' ? <Badge variant="accent">Đang luyện</Badge> : <Badge>Mới</Badge>;

	return <div className={`mx-auto px-4 py-8 ${running ? 'max-w-2xl' : 'max-w-3xl'} space-y-6`}>
		{running ? <div className="flex items-center justify-between border-b border-border pb-4"><p className="font-black">{tab === 'test' ? 'Kiểm tra' : 'Luyện tập'} · {detail.title}</p><Button variant="secondary" onClick={exitFocus}>Thoát</Button></div> : <header className="space-y-3">
			<Link href="/" className="text-sm font-bold text-accent">← Bộ từ</Link>
			<div><p className="label-caps">{detail.label}</p><h1 className="mt-2 text-3xl font-black text-foreground">{detail.title}</h1>{detail.description && <p className="mt-2 text-sm text-muted">{detail.description}</p>}</div>
			<div className="space-y-2"><ProgressBar value={detail.mastered} max={Math.max(1, detail.wordCount)} /><p className="text-sm text-muted">{detail.mastered}/{detail.wordCount} đã nắm · {detail.inMistakeBook} trong Sổ</p></div>
		</header>}
		{!detail.enrolled && !running && <div className="flex flex-col justify-between gap-3 rounded-card border border-accent/30 bg-accent-subtle p-4 sm:flex-row sm:items-center"><div><p className="font-black">Theo học bộ này để bắt đầu</p><p className="text-sm text-muted">Bạn vẫn có thể đọc trước toàn bộ từ.</p></div><EnrollButton setId={detail.id} enrolled={false} /></div>}
		<Tabs value={tab} onValueChange={changeTab}>
			{!running && <TabsList><TabsTrigger value="read">Đọc</TabsTrigger><TabsTrigger value="practice">Luyện</TabsTrigger><TabsTrigger value="test">Kiểm tra</TabsTrigger><TabsTrigger value="result">Kết quả</TabsTrigger></TabsList>}
			<TabsContent value="read"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{([['all', 'Tất cả'], ['unmastered', 'Chưa nắm'], ['mistakes', 'Trong Sổ']] as const).map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? 'primary' : 'secondary'} onClick={() => setFilter(value)}>{label}</Button>)}</div><div className="flex gap-2"><Button size="sm" variant="tertiary" onClick={() => { setHidden((value) => !value); setOpenIds([]); }}>{hidden ? 'Hiện nghĩa' : 'Che nghĩa'}</Button>{hidden && <Button size="sm" variant="secondary" onClick={() => setOpenIds(detail.words.map((word) => word.bundle.sense.id))}>Lật hết</Button>}</div></div>
				<ul className="divide-y divide-border overflow-hidden rounded-card border border-border">{visibleWords.map((word) => { const shown = !hidden || openIds.includes(word.bundle.sense.id); return <li key={word.bundle.sense.id}><button type="button" className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover" onClick={() => { if (hidden && !shown) { setOpenIds((ids) => [...ids, word.bundle.sense.id]); return; } setCard(word.bundle); }}><span><span className="block text-lg font-black">{word.bundle.word.lemma}</span><span className="block text-xs text-muted">{word.bundle.word.ipa}</span><span className="mt-1 flex gap-1">{statusBadge(word.status)}{word.inMistakeBook && <Badge variant="warning">Trong Sổ</Badge>}</span></span><span className="max-w-[55%] text-right text-sm text-foreground-secondary">{shown ? word.bundle.sense.meaningVi : '••••'}</span></button></li>; })}</ul>
			</TabsContent>
			<TabsContent value="practice">{detail.enrolled ? <EnglishPractice mode="set" setId={detail.id} activities={detail.activities} onRunningChange={runningChanged} onNavigateTab={changeTab} /> : <p className="text-sm text-muted">Theo học bộ này trước khi luyện.</p>}</TabsContent>
			<TabsContent value="test">{detail.enrolled ? <EnglishTest mode="set" setId={detail.id} wordCount={Math.min(detail.wordCount, detail.maxWords)} studiedToday={detail.studiedToday} onRunningChange={runningChanged} onFinished={(finished) => { setLastResult(finished); changeTab('result'); }} /> : <p className="text-sm text-muted">Theo học bộ này trước khi kiểm tra.</p>}</TabsContent>
			<TabsContent value="result">{lastResult ? <EnglishTestResult result={lastResult} onPracticeMistakes={() => router.push('/mistakes')} /> : <p className="text-sm text-muted">{detail.mastered}/{detail.wordCount} từ đang ở trạng thái Đã nắm. Nộp một bài kiểm tra để xem kết quả gần nhất.</p>}</TabsContent>
		</Tabs>
		<Dialog open={card !== null} onClose={() => setCard(null)} title={card?.word.lemma ?? 'Từ'}>{card && <EnglishWordCard bundle={card} />}</Dialog>
	</div>;
}
