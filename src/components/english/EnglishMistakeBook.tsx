'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import EnglishPractice from '@/components/english/EnglishPractice';
import EnglishTest from '@/components/english/EnglishTest';
import EnglishWordCard from '@/components/english/EnglishWordCard';
import type { SenseBundle } from '@/lib/english/senseBundle';

interface MistakeWord { senseId: string; lemma: string; ipa: string; meaningVi: string; studiedToday: boolean; setId: string | null; setTitle: string; bundle: SenseBundle; }

export default function EnglishMistakeBook({ words, activities, maxWords }: { words: MistakeWord[]; activities: Array<{ key: string; label: string; role: string; inPractice: boolean }>; maxWords: number }) {
	const [action, setAction] = useState<'practice' | 'test' | null>(null);
	const [card, setCard] = useState<SenseBundle | null>(null);
	const groups = useMemo(() => {
		const map = new Map<string, MistakeWord[]>();
		for (const word of words) map.set(word.setTitle, [...(map.get(word.setTitle) ?? []), word]);
		return [...map.entries()];
	}, [words]);
	const studiedToday = words.filter((word) => word.studiedToday).length;
	return <div className="space-y-8">
		<section className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setAction('practice')} className={`rounded-card border p-5 text-left ${action === 'practice' ? 'border-accent bg-accent-subtle' : 'border-border bg-surface'}`}><p className="text-xl font-black">Luyện từ sai</p><p className="text-sm text-muted">Xem đáp án ngay và luyện lại đến khi nhớ.</p></button><button type="button" onClick={() => setAction('test')} className={`rounded-card border p-5 text-left ${action === 'test' ? 'border-accent bg-accent-subtle' : 'border-border bg-surface'}`}><p className="text-xl font-black">Kiểm tra lại</p><p className="text-sm text-muted">Đúng cả nhận ra và tự nhớ để ra khỏi Sổ.</p></button></section>
		{action === 'practice' && <Card><CardContent><EnglishPractice mode="mistakes" activities={activities} /></CardContent></Card>}
		{action === 'test' && <Card><CardContent><EnglishTest mode="mistakes" wordCount={Math.min(words.length, maxWords)} studiedToday={studiedToday} /></CardContent></Card>}
		<section className="space-y-5">{groups.map(([title, rows]) => <div key={title} className="space-y-2"><h2 className="text-lg font-black">{title}</h2><ul className="space-y-2">{rows.map((word) => <li key={word.senseId}><button type="button" onClick={() => setCard(word.bundle)} className="w-full rounded-card border border-border bg-surface px-4 py-3 text-left hover:border-accent"><p className="font-black">{word.lemma}</p><p className="text-sm text-muted">{word.meaningVi}</p>{word.studiedToday && <p className="text-xs text-warning">Kiểm tra lại từ ngày mai để được tính.</p>}</button></li>)}</ul></div>)}</section>
		<Dialog open={card !== null} onClose={() => setCard(null)} title={card?.word.lemma ?? 'Từ'}>{card && <EnglishWordCard bundle={card} />}</Dialog>
		{action && <Button variant="secondary" onClick={() => setAction(null)}>Đóng khu luyện</Button>}
	</div>;
}
