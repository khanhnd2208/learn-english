'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { englishPost, englishSend } from '@/components/english/englishApi';

interface Quest { id: string; kind: string; target: number; startDay: string; endDay: string; status: string; progress?: { current: number; target: number; done: boolean }; missions?: Array<{ key: string; label: string; done: boolean }>; }

export default function QuestBoard({ sets }: { sets: Array<{ id: string; title: string }> }) {
	const [quests, setQuests] = useState<Quest[]>([]);
	const [kind, setKind] = useState('study_days');
	const [target, setTarget] = useState(4);
	const [setId, setSetId] = useState(sets[0]?.id ?? '');
	const [days, setDays] = useState(7);
	const [error, setError] = useState('');
	async function refresh() { setQuests(await englishSend<Quest[]>('/api/gamify/quest', 'GET')); }
	useEffect(() => { let alive = true; void englishSend<Quest[]>('/api/gamify/quest', 'GET').then((rows) => { if (alive) setQuests(rows); }).catch(() => undefined); return () => { alive = false; }; }, []);
	async function create() {
		setError('');
		try { await englishPost('/api/gamify/quest', { kind, target, ...(kind === 'set_mastery' ? { setId } : {}), days }); await refresh(); }
		catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tạo được nhiệm vụ'); }
	}
	return <div className="space-y-4">
		<div className="grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2">
			<label className="text-xs font-bold text-muted">Mẫu nhiệm vụ<Select value={kind} onChange={(event) => setKind(event.target.value)}><option value="study_days">Học đều trong tuần</option><option value="set_mastery">Nắm từ trong một bộ</option><option value="hold_words">Giữ vững từ</option><option value="clear_mistakes">Dọn Sổ từ sai</option></Select></label>
			{kind === 'set_mastery' && <label className="text-xs font-bold text-muted">Bộ từ<Select value={setId} onChange={(event) => setSetId(event.target.value)}>{sets.map((set) => <option key={set.id} value={set.id}>{set.title}</option>)}</Select></label>}
			<label className="text-xs font-bold text-muted">Mục tiêu<Input type="number" min={1} max={5000} value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label>
			<label className="text-xs font-bold text-muted">Hạn (ngày)<Input type="number" min={1} max={90} value={days} onChange={(event) => setDays(Number(event.target.value))} /></label>
			<div className="sm:col-span-2"><Button onClick={() => void create()}>Tạo nhiệm vụ</Button>{error && <p className="mt-2 text-sm text-error">{error}</p>}<p className="mt-2 text-xs text-muted">Nhiệm vụ không cộng XP; tiến độ được tính từ hoạt động đã ghi nhận.</p></div>
		</div>
		{quests.length === 0 ? <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted">Chưa có nhiệm vụ đang chạy. Chọn mục tiêu vừa sức để bắt đầu.</p> : <ul className="space-y-2">{quests.map((quest) => <li key={quest.id} className="rounded-card border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{quest.kind === 'set_mastery' ? 'Nắm từ trong bộ' : quest.kind === 'hold_words' ? 'Giữ vững từ' : quest.kind === 'clear_mistakes' ? 'Dọn Sổ từ sai' : 'Học đều trong tuần'}</p><p className="mt-1 text-sm text-muted">{quest.status === 'done' ? 'Đã hoàn thành' : quest.status === 'ended' ? 'Đã kết thúc · có thể đặt mục tiêu vừa sức hơn' : `Đến ${quest.endDay}`}</p></div><span className="text-sm font-black">{quest.progress?.current ?? 0}/{quest.target}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-dim"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((quest.progress?.current ?? 0) / quest.target) * 100)}%` }} /></div>{quest.missions && <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">{quest.missions.map((mission) => <li key={mission.key} className={mission.done ? 'text-success' : 'text-muted'}>{mission.done ? '✓' : '○'} {mission.label}</li>)}</ul>}</li>)}</ul>}
	</div>;
}
