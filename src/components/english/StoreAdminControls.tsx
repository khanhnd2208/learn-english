'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { publishEnglishSetRequest, publishSummary } from '@/lib/english/publishClient';

type Props = {
	setId: string;
	title: string;
	status: string;
	listed: boolean;
	accessCode: string | null;
	learners: number;
};

export default function StoreAdminControls({ setId, title, status, listed: initialListed, accessCode: initialAccessCode, learners }: Props) {
	const router = useRouter();
	const { toast } = useToast();
	const [listed, setListed] = useState(initialListed);
	const [accessCode, setAccessCode] = useState(initialAccessCode ?? '');
	const [draftCode, setDraftCode] = useState(initialAccessCode ?? '');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [confirmDelete, setConfirmDelete] = useState(false);

	async function request(path: string, options: RequestInit) {
		const response = await fetch(path, options);
		const body = await response.json() as { ok?: boolean; error?: string };
		if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không cập nhật được bộ từ');
	}

	async function changeListing() {
		setPending(true); setError('');
		try {
			if (status === 'draft') {
				// Only list the set once at least one word is live; otherwise learners get "chưa xuất bản".
				const outcome = await publishEnglishSetRequest(setId);
				await request(`/api/admin/sets/${setId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listed: true }) });
				setListed(true);
				toast(publishSummary(outcome), 'success');
			} else {
				await request(`/api/admin/sets/${setId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listed: !listed }) });
				setListed(!listed);
			}
			router.refresh();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được bộ từ'); }
		finally { setPending(false); }
	}

	async function saveCode(nextCode = draftCode) {
		setPending(true); setError('');
		try {
			await request(`/api/admin/sets/${setId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode: nextCode }) });
			setAccessCode(nextCode.trim()); setDraftCode(nextCode.trim()); router.refresh();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được mật khẩu'); }
		finally { setPending(false); }
	}

	async function remove() {
		setPending(true); setError('');
		try { await request(`/api/admin/sets/${setId}`, { method: 'DELETE' }); setConfirmDelete(false); router.refresh(); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xoá được bộ từ'); }
		finally { setPending(false); }
	}

	const statusLabel = status === 'draft' ? 'Nháp' : listed ? 'Đang hiện' : 'Đã ẩn';
	return <div className="mt-4 space-y-3 border-t border-border pt-3 text-sm" onClick={(event) => event.stopPropagation()}>
		<div className="flex flex-wrap items-center justify-between gap-2">
			<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === 'draft' ? 'bg-warning/15 text-warning' : listed ? 'bg-success/15 text-success' : 'bg-surface-container text-muted'}`}>{statusLabel} · {learners} người học</span>
			<Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => void changeListing()}>{status === 'draft' ? 'Xuất bản lên cửa hàng' : listed ? 'Ẩn khỏi cửa hàng' : 'Hiện lại'}</Button>
		</div>
		{status === 'draft' && <p className="text-xs text-muted">Bản nháp: học viên chưa thấy và chưa tải được bộ này cho đến khi xuất bản.</p>}
		{status !== 'draft' && <p className="text-xs text-muted">{listed ? 'Ẩn: học viên mới không thấy bộ này; người đã tải vẫn học được.' : 'Đang ẩn: chỉ người đã tải mới mở được bộ này.'}</p>}
		<div className="flex flex-wrap items-end gap-2">
			<label className="min-w-48 flex-1"><span className="mb-1 block text-xs font-bold text-muted">Mật khẩu</span><input value={draftCode} maxLength={64} onChange={(event) => setDraftCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void saveCode(); } }} placeholder="Không khoá" className="min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm outline-none focus:border-accent" /></label>
			<Button type="button" size="sm" disabled={pending || draftCode === accessCode} onClick={() => void saveCode()}>Lưu</Button>
			{accessCode && <><Button type="button" size="sm" variant="tertiary" disabled={pending} onClick={() => { void navigator.clipboard?.writeText(accessCode).then(() => toast('Đã copy mật khẩu', 'success'), () => toast('Không copy được, hãy chọn và copy tay', 'error')); }}>Copy</Button><Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void saveCode('')}>Xoá mã</Button></>}
		</div>
		{error && <p className="text-sm text-error">{error}</p>}
		<Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>Xoá hẳn</Button>
		<Dialog open={confirmDelete} onClose={() => !pending && setConfirmDelete(false)} title={`Xoá “${title}”?`} description={`${learners} người đang học sẽ mất bộ này. Tiến độ từng từ vẫn được giữ.`}>
			<div className="flex justify-end gap-2"><button type="button" className="min-h-11 px-4 font-bold" onClick={() => setConfirmDelete(false)} disabled={pending}>Huỷ</button><Button type="button" variant="destructive" loading={pending} onClick={() => void remove()}>Xoá hẳn</Button></div>
		</Dialog>
	</div>;
}
