'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';

/** Asks before leaving a study session, and says what is kept. */
export default function ConfirmExitDialog({ open, title, description, busy = false, stayLabel = 'Học tiếp', leaveLabel = 'Thoát', onStay, onLeave }: { open: boolean; title: string; description: string; busy?: boolean; stayLabel?: string; leaveLabel?: string; onStay: () => void; onLeave: () => void }) {
	return <Dialog open={open} onClose={() => { if (!busy) onStay(); }} title={title} description={description}>
		<div className="flex justify-end gap-2">
			<Button type="button" variant="ghost" disabled={busy} onClick={onStay}>{stayLabel}</Button>
			<Button type="button" loading={busy} onClick={onLeave}>{leaveLabel}</Button>
		</div>
	</Dialog>;
}
