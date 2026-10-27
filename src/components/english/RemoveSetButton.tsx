'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';

function removeNote(locked: boolean, listed: boolean): string {
	if (!listed) return 'Bộ này đã ẩn khỏi cửa hàng, gỡ rồi sẽ không tải lại được. Tiến độ từng từ vẫn được giữ.';
	if (locked) return 'Bộ từ sẽ không còn trong lịch ôn. Tiến độ được giữ, nhưng bạn sẽ cần mật khẩu để tải lại.';
	return 'Bộ từ sẽ không còn trong lịch ôn. Tiến độ được giữ để bạn tải lại sau.';
}

export default function RemoveSetButton({ setId, setTitle, stayOnPage = false, compact = false, locked = false, listed = true }: { setId: string; setTitle?: string; stayOnPage?: boolean; compact?: boolean; locked?: boolean; listed?: boolean }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');

	async function remove() {
		setPending(true);
		setError('');
		try {
			const response = await fetch('/api/enroll', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setId }) });
			const body = await response.json() as { ok?: boolean; error?: string };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không gỡ được bộ từ');
			setOpen(false);
			if (!stayOnPage) router.push('/');
			router.refresh();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không gỡ được bộ từ');
		} finally {
			setPending(false);
		}
	}

	return <>
		<button
			type="button"
			onClick={() => setOpen(true)}
			aria-label={setTitle ? `Gỡ bộ từ ${setTitle}` : 'Gỡ bộ từ'}
			className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-control border border-border text-sm font-bold text-muted hover:border-error hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error ${compact ? 'min-w-11 px-2 sm:px-3' : 'px-4'}`}
		>
			{compact && <MaterialIcon name="delete" size={18} />}
			<span className={compact ? 'hidden sm:inline' : ''}>Gỡ bộ</span>
		</button>
		<Dialog open={open} onClose={() => !pending && setOpen(false)} title={setTitle ? `Gỡ “${setTitle}” khỏi ôn tập?` : 'Gỡ bộ khỏi danh sách?'} description={removeNote(locked, listed)}>
			{error && <p className="mb-3 text-sm text-error">{error}</p>}
			<div className="flex justify-end gap-2"><button type="button" className="min-h-11 px-4 font-bold" onClick={() => setOpen(false)} disabled={pending}>Huỷ</button><Button type="button" variant="destructive" onClick={() => void remove()} loading={pending}>Gỡ bộ</Button></div>
		</Dialog>
	</>;
}
