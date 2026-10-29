'use client';

import { useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { englishPost } from '@/components/english/englishApi';

/** Ôn luân phiên only: send a wrong typed answer to the admin inbox as "also correct". */
export default function AppealForm({ reviewId, answer }: { reviewId: string; answer: string }) {
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState('');
	const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
	const [error, setError] = useState('');

	async function send() {
		if (state !== 'idle') return;
		setState('sending');
		setError('');
		try {
			await englishPost('/api/daily/appeal', { reviewId, answer, note: note.trim() || undefined });
			setState('sent');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Không gửi được');
			setState('idle');
		}
	}

	if (state === 'sent') return <p role="status" className="flex items-start gap-2 rounded-panel bg-surface-secondary px-3 py-2 text-sm text-foreground-secondary"><MaterialIcon name="flag" size={18} className="mt-0.5 shrink-0 text-accent" /><span>Đã gửi admin xem lại. Nếu đáp án <strong>{answer}</strong> được chấp nhận, lịch ôn của từ này sẽ được trả lại như khi bạn trả lời đúng.</span></p>;
	if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-accent"><MaterialIcon name="flag" size={16} />Đáp án của tôi cũng đúng?</button>;
	return <div data-no-enter-advance className="space-y-2 rounded-panel border border-border bg-surface p-3">
		<p className="text-sm text-foreground-secondary">Gửi <strong className="font-mono">{answer}</strong> cho admin xem lại. Nếu admin đồng ý, câu này được tính là đúng và lịch ôn không bị trừ.</p>
		<input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} maxLength={300} placeholder="Lý do (không bắt buộc), ví dụ: từ đồng nghĩa trong ngữ cảnh này" aria-label="Lý do khiếu nại" className="min-h-10 w-full rounded-control border border-border bg-background px-3 text-sm focus:border-accent" />
		{error && <p role="alert" className="text-sm text-error">{error}</p>}
		<div className="flex justify-end gap-2">
			<button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-control px-3 text-sm font-bold text-muted">Huỷ</button>
			<button type="button" disabled={state === 'sending'} onClick={() => void send()} className="min-h-9 rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-50">{state === 'sending' ? 'Đang gửi…' : 'Gửi admin xem lại'}</button>
		</div>
	</div>;
}
