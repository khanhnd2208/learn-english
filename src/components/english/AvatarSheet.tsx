'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { englishSend } from '@/components/english/englishApi';
import { AVATAR_CHANGED_EVENT, AVATAR_PROBLEM_COPY, AVATAR_TYPES, checkAvatarUpload } from '@/lib/english/avatar';

export default function AvatarSheet({ open, onClose, name, avatarUrl, hasUpload }: {
	open: boolean;
	onClose: () => void;
	name: string;
	avatarUrl: string | null;
	hasUpload: boolean;
}) {
	const router = useRouter();
	const inputId = useId();
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

	function close() {
		setFile(null);
		setPreview(null);
		setError('');
		onClose();
	}

	function choose(next: File | null) {
		if (!next) return;
		const problem = checkAvatarUpload(next);
		if (problem) {
			setFile(null);
			setPreview(null);
			setError(AVATAR_PROBLEM_COPY[problem]);
			return;
		}
		setFile(next);
		setPreview(URL.createObjectURL(next));
		setError('');
	}

	async function save() {
		if (!file) return;
		setBusy(true);
		setError('');
		try {
			const form = new FormData();
			form.set('file', file);
			const response = await fetch('/api/profile/avatar', { method: 'POST', body: form });
			const payload = await response.json().catch(() => ({})) as { ok?: boolean; data?: { avatarUrl: string }; error?: string };
			if (!response.ok || !payload.ok) {
				setError(payload.error ?? AVATAR_PROBLEM_COPY.failed);
				return;
			}
			if (!payload.data) {
				setError(AVATAR_PROBLEM_COPY.failed);
				return;
			}
			window.dispatchEvent(new CustomEvent(AVATAR_CHANGED_EVENT, { detail: payload.data }));
			close();
			router.refresh();
		} catch {
			setError(AVATAR_PROBLEM_COPY.failed);
		} finally {
			setBusy(false);
		}
	}

	async function removeUploadedAvatar() {
		setBusy(true);
		setError('');
		try {
			const result = await englishSend<{ avatarUrl: string | null }>('/api/profile/avatar', 'DELETE');
			window.dispatchEvent(new CustomEvent(AVATAR_CHANGED_EVENT, { detail: result }));
			close();
			router.refresh();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : AVATAR_PROBLEM_COPY.failed);
		} finally {
			setBusy(false);
		}
	}

	return <Sheet open={open} onClose={busy ? () => undefined : close} title="Ảnh đại diện">
		<div className="flex flex-col items-center text-center">
			<Avatar src={preview ?? avatarUrl} name={name} size="xxl" />
			<p className="mt-4 text-sm text-muted">Ảnh JPG, PNG hoặc WebP, tối đa 2 MB. Ảnh sẽ được cắt vuông.</p>
			<input
				id={inputId}
				type="file"
				accept={AVATAR_TYPES.join(',')}
				className="sr-only"
				disabled={busy}
				onChange={(event) => choose(event.target.files?.[0] ?? null)}
			/>
			<label htmlFor={inputId} aria-disabled={busy} className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-control border border-border px-4 text-xs font-bold uppercase tracking-wider text-foreground-secondary hover:border-accent hover:text-accent aria-disabled:pointer-events-none aria-disabled:opacity-50">Chọn ảnh</label>
		</div>
		{error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
		<div className="mt-5 flex flex-col gap-2 sm:flex-row">
			<Button onClick={() => void save()} disabled={!file || busy} fullWidth className="sm:w-auto">{busy ? 'Đang lưu…' : 'Lưu ảnh'}</Button>
			{hasUpload && <Button variant="ghost" onClick={() => void removeUploadedAvatar()} disabled={busy} fullWidth className="sm:w-auto">Dùng ảnh mặc định</Button>}
			<Button variant="secondary" onClick={close} disabled={busy} fullWidth className="sm:ml-auto sm:w-auto">Huỷ</Button>
		</div>
	</Sheet>;
}
