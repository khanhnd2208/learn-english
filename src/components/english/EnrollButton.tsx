'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';

export default function EnrollButton({ setId, enrolled, locked = false }: { setId: string; enrolled: boolean; locked?: boolean }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [done, setDone] = useState(enrolled);
	const [error, setError] = useState('');
	const [unlocking, setUnlocking] = useState(false);
	const [accessCode, setAccessCode] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	async function enroll() {
		setPending(true);
		setError('');
		try {
			const response = await fetch('/api/enroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setId, ...(locked ? { accessCode } : {}) }),
			});
			const body = await response.json() as { ok?: boolean; error?: string };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không tải được bộ từ');
			setDone(true);
			router.push('/');
			router.refresh();
		} catch (enrollError) {
			setError(enrollError instanceof Error ? enrollError.message : 'Không tải được bộ từ');
			if (locked) window.setTimeout(() => inputRef.current?.select(), 0);
		} finally {
			setPending(false);
		}
	}

	if (done && !pending) return <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><MaterialIcon name="check_circle" filled size={16} />Đã tải</span>;

	return (
		<div className="space-y-2">
			{!unlocking ? <Button type="button" disabled={done || pending} onClick={() => {
				if (!locked) void enroll();
				else { setUnlocking(true); setError(''); window.setTimeout(() => inputRef.current?.focus(), 0); }
			}}>
				{locked && <MaterialIcon name="lock" size={16} />}Tải về
			</Button> : <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void enroll(); }}>
				<input ref={inputRef} type="text" aria-label="Mật khẩu bộ từ" placeholder="Nhập mật khẩu" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} disabled={pending} className="min-h-10 min-w-32 flex-1 rounded-control border border-border bg-surface px-3 text-sm outline-none focus:border-accent" />
				<Button type="submit" disabled={pending || !accessCode.trim()} loading={pending}>Mở khoá</Button>
				<Button type="button" variant="ghost" disabled={pending} onClick={() => { setUnlocking(false); setAccessCode(''); setError(''); }}>Huỷ</Button>
			</form>}
			{error && <p className="text-sm text-error">{error}</p>}
		</div>
	);
}
