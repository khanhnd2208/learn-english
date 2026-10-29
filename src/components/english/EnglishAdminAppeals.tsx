'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { englishPost, englishSend } from '@/components/english/englishApi';
import type { AppealStatus } from '@/lib/english/appeal';
import type { AppealRow } from '@/services/english/enAppealService';

const TABS: Array<[AppealStatus, string]> = [['pending', 'Chờ xử lý'], ['accepted', 'Đã chấp nhận'], ['rejected', 'Đã từ chối']];
const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Inbox of "my answer is also correct" claims from Ôn luân phiên. Accepting gives the learner's schedule back. */
export default function EnglishAdminAppeals({ onPendingChange }: { onPendingChange?: (count: number) => void }) {
	const [status, setStatus] = useState<AppealStatus>('pending');
	const [loaded, setLoaded] = useState<{ status: AppealStatus; rows: AppealRow[] } | null>(null);
	const rows = loaded?.status === status ? loaded.rows : null;
	const [busyId, setBusyId] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let live = true;
		englishSend<AppealRow[]>(`/api/admin/appeals?status=${status}`, 'GET').then((data) => {
			if (!live) return;
			setLoaded({ status, rows: data });
			if (status === 'pending') onPendingChange?.(data.length);
		}, (cause) => {
			if (!live) return;
			setLoaded({ status, rows: [] });
			setMessage(cause instanceof Error ? cause.message : 'Không tải được hòm thư');
		});
		return () => { live = false; };
	}, [onPendingChange, status]);

	async function resolve(row: AppealRow, decision: 'accepted' | 'rejected') {
		setBusyId(row.id);
		setMessage('');
		try {
			const result = await englishPost<{ restored: boolean }>('/api/admin/appeals', { id: row.id, decision });
			setMessage(decision === 'rejected' ? `Đã từ chối “${row.answer}”.` : result.restored ? `Đã chấp nhận “${row.answer}” và trả lại lịch ôn cho người học.` : `Đã chấp nhận “${row.answer}”. Lịch ôn không cần đổi.`);
			const next = (rows ?? []).filter((item) => item.id !== row.id);
			setLoaded({ status, rows: next });
			onPendingChange?.(next.length);
		} catch (cause) {
			setMessage(cause instanceof Error ? cause.message : 'Không xử lý được');
		} finally {
			setBusyId('');
		}
	}

	return <Card><CardContent className="space-y-4">
		<div><p className="font-black">Hòm thư khiếu nại đáp án</p><p className="text-sm text-muted">Người học gửi từ Ôn luân phiên khi cho rằng đáp án của họ cũng đúng. Chấp nhận thì câu đó được tính đúng và lịch ôn của từ không bị trừ.</p></div>
		<div className="flex flex-wrap gap-2" role="group" aria-label="Lọc khiếu nại">{TABS.map(([value, label]) => <Button key={value} type="button" size="sm" variant={status === value ? 'primary' : 'secondary'} onClick={() => setStatus(value)}>{label}</Button>)}</div>
		{message && <p role="status" className="text-sm text-foreground">{message}</p>}
		{rows === null ? <p className="text-sm text-muted">Đang tải…</p> : rows.length === 0 ? <p className="rounded-panel bg-surface-secondary p-4 text-center text-sm text-muted">Không có khiếu nại nào.</p> : <ul className="space-y-3">{rows.map((row) => <li key={row.id} className="space-y-2 rounded-panel border border-border p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm text-muted">{row.userName || row.userEmail || 'Người học'} · {time(row.createdAt)}</p>{row.status !== 'pending' && row.resolvedAt && <p className="text-xs text-muted">Xử lý {time(row.resolvedAt)}{row.status === 'accepted' && (row.restored ? ' · đã trả lịch' : ' · lịch không đổi')}</p>}</div>
			<p className="text-sm">Nghĩa: <strong>{row.word?.meaningVi ?? '—'}</strong>{row.word?.partOfSpeech && <span className="text-muted"> ({row.word.partOfSpeech})</span>}</p>
			<div className="grid gap-2 sm:grid-cols-2">
				<p className="rounded-control bg-error/5 px-3 py-2 text-sm">Người học gõ<br /><strong className="font-mono text-lg">{row.answer}</strong></p>
				<p className="rounded-control bg-success-subtle px-3 py-2 text-sm">Đáp án của bộ<br /><strong className="font-mono text-lg">{row.expected || row.word?.lemma}</strong></p>
			</div>
			{row.word && (row.word.synonyms.length > 0 || row.word.forms.length > 0) && <p className="text-xs text-muted">{row.word.forms.length > 0 && <>Dạng từ: {row.word.forms.join(', ')}. </>}{row.word.synonyms.length > 0 && <>Gần nghĩa: {row.word.synonyms.join(', ')}.</>}</p>}
			{row.note && <p className="rounded-control bg-surface-secondary px-3 py-2 text-sm">“{row.note}”</p>}
			{row.status === 'pending' && <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" disabled={busyId === row.id} onClick={() => void resolve(row, 'rejected')}>Từ chối</Button><Button type="button" disabled={busyId === row.id} onClick={() => void resolve(row, 'accepted')}>Chấp nhận · không trừ SRS</Button></div>}
		</li>)}</ul>}
	</CardContent></Card>;
}
