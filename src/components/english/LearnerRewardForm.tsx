'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AdventureIcon } from '@/components/english/AdventureIcon';

export default function LearnerRewardForm({ unlockLevel }: { unlockLevel: number }) {
	const [title, setTitle] = useState('');
	const [saved, setSaved] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	async function save(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!title.trim()) return;
		setBusy(true);
		setError('');
		try {
			const response = await fetch('/api/gamify/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), unlockLevel }) });
			if (!response.ok) throw new Error('Chưa thể lưu phần thưởng. Thử lại nhé.');
			setTitle('');
			setSaved(true);
			window.setTimeout(() => setSaved(false), 2200);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Chưa thể lưu phần thưởng.');
		} finally {
			setBusy(false);
		}
	}
	return <Card className="game-card game-card-amber"><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><AdventureIcon name="chest" size={24} framed /><div><p className="label-caps">Rương phần thưởng</p><p className="text-sm text-muted">Chọn món quà chờ bạn ở cấp {unlockLevel}.</p></div></div><form onSubmit={(event) => void save(event)} className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row"><label htmlFor="reward-title" className="sr-only">Phần thưởng đời thực</label><input id="reward-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: xem một tập phim" maxLength={120} className="h-11 min-w-0 flex-1 rounded-xl border-2 border-border bg-surface px-3 text-sm shadow-inner"/><Button type="submit" disabled={busy || !title.trim()}>{busy ? 'Đang cất…' : saved ? 'Đã cất vào rương' : 'Đặt phần thưởng'}</Button></form>{error && <p role="alert" className="text-sm text-error">{error}</p>}</CardContent></Card>;
}
