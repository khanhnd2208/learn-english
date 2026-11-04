'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { Card, CardContent } from '@/components/ui/Card';
import { englishPost } from '@/components/english/englishApi';

export default function EnglishAdminQaTools({ sets }: { sets: Array<{ id: string; title: string }> }) {
	const [confirmReset, setConfirmReset] = useState(false);
	const [setId, setSetId] = useState(sets[0]?.id ?? '');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('');

	async function run(action: 'shift_one_day' | 'reset') {
		if (!setId) return;
		setBusy(true); setMessage('');
		try {
			await englishPost('/api/admin/qa', { action, setId });
			setMessage(action === 'reset' ? 'Đã xoá tiến độ của bạn với bộ này.' : 'Đã lùi dữ liệu học của bạn 1 ngày.');
		} catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không chạy được công cụ test'); }
		finally { setBusy(false); }
	}

	return <Card><CardContent className="space-y-4"><div><p className="font-black">Dữ liệu của tài khoản admin hiện tại</p><p className="text-sm text-muted">Các thao tác dưới đây không ảnh hưởng người học khác.</p></div><label className="block text-sm font-bold">Bộ từ<select value={setId} onChange={(event) => setSetId(event.target.value)} className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3">{sets.map((set) => <option key={set.id} value={set.id}>{set.title}</option>)}</select></label><div className="flex flex-wrap gap-2"><Button disabled={busy || !setId} onClick={() => void run('shift_one_day')}>Lùi thời gian 1 ngày</Button><Button variant="destructive" disabled={busy || !setId} onClick={() => setConfirmReset(true)}>Xoá tiến độ của tôi</Button></div>{message && <p className="text-sm text-foreground">{message}</p>}<Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Xoá tiến độ của bạn với bộ này?" description="Hành động này không thể hoàn tác."><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmReset(false)}>Huỷ</Button><Button variant="destructive" onClick={() => { setConfirmReset(false); void run('reset'); }}>Xoá tiến độ</Button></div></Dialog></CardContent></Card>;
}
