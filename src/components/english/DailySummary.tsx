'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { englishSend } from '@/components/english/englishApi';

interface Note { note: string; }
interface Summary { todayXp: number; held: number; mastered: number; }
export default function DailySummary() {
	const [summary, setSummary] = useState<Summary | null>(null);
	const [note, setNote] = useState('');
	const [saved, setSaved] = useState(false);
	useEffect(() => { void Promise.all([englishSend<Summary>('/api/gamify/summary', 'GET'), englishSend<Note | null>('/api/gamify/note', 'GET')]).then(([facts, savedNote]) => { setSummary(facts); setNote(savedNote?.note ?? ''); }).catch(() => undefined); }, []);
	async function save() { await fetch('/api/gamify/note', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) }); setSaved(true); window.setTimeout(() => setSaved(false), 2000); }
	return <Card><CardContent className="space-y-3"><div><p className="label-caps">Tổng kết hôm nay</p><h2 className="mt-1 text-lg font-black">Một ngày có ý nghĩa</h2></div><div className="grid grid-cols-3 gap-2 text-center">{[['XP ghi nhớ', summary?.todayXp ?? 0], ['Từ giữ vững', summary?.held ?? 0], ['Đang nắm', summary?.mastered ?? 0]].map(([label, value]) => <div key={label} className="rounded-control bg-surface-container p-2"><strong className="block text-lg">{value}</strong><span className="text-[10px] text-muted">{label}</span></div>)}</div><Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={1000} placeholder="Tuỳ chọn: hôm nay bạn nhận ra điều gì?"/><Button variant="secondary" onClick={() => void save()}>{saved ? 'Đã lưu' : 'Lưu ghi chú'}</Button></CardContent></Card>;
}
