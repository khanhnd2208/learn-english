'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { publishEnglishSetRequest, publishSummary } from '@/lib/english/publishClient';

export default function PublishSetButton({ setId }: { setId: string }) {
	const router = useRouter();
	const { toast } = useToast();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');

	async function publish() {
		setPending(true); setError('');
		try {
			toast(publishSummary(await publishEnglishSetRequest(setId)), 'success');
			router.refresh();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xuất bản được'); }
		finally { setPending(false); }
	}

	return <div className="space-y-2">
		<Button type="button" loading={pending} disabled={pending} onClick={() => void publish()}>Xuất bản lên cửa hàng</Button>
		{error && <p className="text-sm text-error">{error}</p>}
	</div>;
}
