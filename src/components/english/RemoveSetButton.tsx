'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

export default function RemoveSetButton({ setId }: { setId: string }) {
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
			router.push('/');
			router.refresh();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không gỡ được bộ từ');
		} finally {
			setPending(false);
		}
	}

	return <>
		<button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-control border border-border px-4 text-sm font-bold text-muted hover:border-error hover:text-error">Gỡ bộ</button>
		<Dialog open={open} onClose={() => !pending && setOpen(false)} title="Gỡ bộ khỏi danh sách?" description="Tiến độ được giữ, tải lại để học tiếp.">
			{error && <p className="mb-3 text-sm text-error">{error}</p>}
			<div className="flex justify-end gap-2"><button type="button" className="min-h-11 px-4 font-bold" onClick={() => setOpen(false)} disabled={pending}>Huỷ</button><Button type="button" onClick={() => void remove()} disabled={pending}>Gỡ bộ</Button></div>
		</Dialog>
	</>;
}
