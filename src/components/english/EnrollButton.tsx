'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';

export default function EnrollButton({ setId, enrolled }: { setId: string; enrolled: boolean }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [done, setDone] = useState(enrolled);
	const [error, setError] = useState('');

	async function enroll() {
		setPending(true);
		setError('');
		try {
			const response = await fetch('/api/enroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setId }),
			});
			const body = await response.json() as { ok?: boolean; error?: string };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không tải được bộ từ');
			setDone(true);
			router.push('/');
			router.refresh();
		} catch (enrollError) {
			setError(enrollError instanceof Error ? enrollError.message : 'Không tải được bộ từ');
		} finally {
			setPending(false);
		}
	}

	if (done && !pending) return <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><MaterialIcon name="check_circle" filled size={16} />Đã tải</span>;

	return (
		<div className="space-y-2">
			<Button type="button" disabled={done || pending} onClick={() => void enroll()}>
				Tải về
			</Button>
			{error && <p className="text-sm text-error">{error}</p>}
		</div>
	);
}
