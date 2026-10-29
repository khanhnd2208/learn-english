'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import EnglishAdminPromptCard from '@/components/english/EnglishAdminPromptCard';
import EnglishAdminQaTools from '@/components/english/EnglishAdminQaTools';
import EnglishAdminAppeals from '@/components/english/EnglishAdminAppeals';
import type { EnglishPackPreview } from '@/lib/english/packPreview';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { publishEnglishSetRequest, publishSummary } from '@/lib/english/publishClient';

interface Issue {
	path: string;
	message: string;
	code: string;
}

interface SetRow {
	id: string;
	title: string;
	status: string;
	items: number;
	learners: number;
}

export default function EnglishAdmin({ sets, qaEnabled, pendingAppeals }: { sets: SetRow[]; qaEnabled: boolean; pendingAppeals: number }) {
	const router = useRouter();
	const [text, setText] = useState('');
	const [issues, setIssues] = useState<Issue[]>([]);
	const [preview, setPreview] = useState<EnglishPackPreview | null>(null);
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const [panel, setPanel] = useState<'content' | 'appeals' | 'qa'>(pendingAppeals > 0 ? 'appeals' : 'content');
	const [pending, setPending] = useState(pendingAppeals);

	async function send(action: 'preview' | 'save', publishAfterSave = false) {
		setBusy(true);
		setMessage('');
		try {
			const pack = JSON.parse(text) as unknown;
			const response = await fetch('/api/admin/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, pack }),
			});
			const body = await response.json() as {
				ok?: boolean;
				error?: string;
				data?: { issues?: Issue[]; setId?: string; drafts?: number; preview?: EnglishPackPreview | null };
			};
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không xử lý được gói nội dung');
			setIssues(body.data?.issues ?? []);
			setPreview(action === 'preview' ? body.data?.preview ?? null : null);
			if (action === 'preview') setMessage(`Xem trước: ${body.data?.drafts ?? 0} từ đủ điều kiện xuất bản.`);
			else if (publishAfterSave && body.data?.setId) {
				setMessage('Đã lưu bản nháp, đang xuất bản…');
				try { setMessage(`${publishSummary(await publishEnglishSetRequest(body.data.setId))} Bộ đã lên cửa hàng.`); }
				catch (error) { setMessage(`Đã lưu bản nháp. ${error instanceof Error ? error.message : 'Không xuất bản được'}`); }
			} else setMessage('Đã lưu bản nháp. Bấm “Xuất bản” ở danh sách bên dưới để đưa lên cửa hàng.');
			if (action === 'save') router.refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'JSON không hợp lệ');
		} finally {
			setBusy(false);
		}
	}

	async function publish(setId: string) {
		setBusy(true);
		setMessage('');
		try {
			const outcome = await publishEnglishSetRequest(setId);
			setIssues(outcome.issues);
			setMessage(publishSummary(outcome));
			router.refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không xuất bản được');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
			<header>
				<h1 className="text-3xl font-black text-foreground">Nội dung tiếng Anh</h1>
				<p className="mt-2 text-sm text-muted">Tạo prompt ở bước 1, đưa cho AI, rồi dán JSON AI trả về ở bước 2. Từ thiếu nghĩa Việt hoặc câu ví dụ hợp lệ không được xuất bản. File audio phải nằm trong thư mục ENGLISH_AUDIO_ROOT, ngoài thư mục release.</p>
			</header>
			<div className="flex gap-2">
				<Button type="button" variant={panel === 'content' ? 'primary' : 'secondary'} onClick={() => setPanel('content')}>Nội dung</Button>
				<Button type="button" variant={panel === 'appeals' ? 'primary' : 'secondary'} onClick={() => setPanel('appeals')}>Hòm thư{pending > 0 && <span className="ml-1.5 rounded-full bg-error px-1.5 text-xs font-black text-white">{pending}</span>}</Button>
				{qaEnabled && <Button type="button" variant={panel === 'qa' ? 'primary' : 'secondary'} onClick={() => setPanel('qa')}>Công cụ test</Button>}
			</div>
			{panel === 'qa' && <EnglishAdminQaTools sets={sets} />}
			{panel === 'appeals' && <EnglishAdminAppeals onPendingChange={setPending} />}
			{panel === 'content' && <>
			<EnglishAdminPromptCard />
			<Card>
				<CardContent className="space-y-3">
					<h2 className="text-lg font-black text-foreground">Bước 2 · Dán JSON AI trả về</h2>
					<textarea
						aria-label="Gói nội dung JSON"
						value={text}
						onChange={(event) => setText(event.target.value)}
						className="min-h-48 w-full rounded-control border border-border bg-surface p-3 font-mono text-xs"
					/>
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="tertiary" onClick={() => setText(JSON.stringify(sampleEnglishPack, null, 2))}>Điền gói mẫu</Button>
						<Button type="button" variant="secondary" disabled={busy || !text.trim()} onClick={() => void send('preview')}>Xem trước</Button>
						<Button type="button" variant="secondary" disabled={busy || !text.trim()} onClick={() => void send('save')}>Lưu bản nháp</Button>
						<Button type="button" disabled={busy || !text.trim()} onClick={() => void send('save', true)}>Lưu &amp; xuất bản</Button>
					</div>
					{message && <p className="text-sm text-foreground">{message}</p>}
					{preview && (
						<div className="space-y-3 border-t border-border pt-3">
							<h2 className="text-lg font-black">Xem trước — chỉ đọc</h2>
                            {preview.words.map((word) => <div key={`${word.senseKey}-${word.meaningVi}`} className="space-y-1 text-sm">
                                <p className="font-black">{word.lemma} · {word.ipa} · {word.partOfSpeech}</p>
                                <p>{word.meaningVi}</p>
                                {word.noteVi && <p>{word.noteVi}</p>}
                                {word.synonyms.length > 0 && <p>Gần nghĩa: {word.synonyms.join(', ')}</p>}
                                {word.family.length > 0 && <p>Họ từ: {word.family.map((member) => `${member.word} (${member.partOfSpeech}) ${member.meaningVi}`).join(' · ')}</p>}
                                <p className="text-muted"><span className="font-bold">Trên thẻ:</span> {word.cardExample.english} — {word.cardExample.meaningVi}</p>
                                {word.quizExamples.length > 0 && <div className="rounded-control bg-accent-subtle p-3"><p className="font-bold">Câu hỏi ẩn ({word.quizExamples.length})</p>{word.quizExamples.map((example, index) => <p key={index}><strong>{example.english}</strong> — {example.meaningVi}</p>)}</div>}
                                {word.advanced.length > 0 && <p className="text-muted">Nâng cao: {word.advanced.map((note) => note.phrase).join(' · ')}</p>}
                            </div>)}
						</div>
					)}
					{issues.length > 0 && (
						<ul className="space-y-1 text-sm text-warning">
							{issues.slice(0, 30).map((issue) => (
								<li key={`${issue.path}-${issue.code}`}>{issue.path}: {issue.message}</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
			<section className="space-y-3">
				<h2 className="text-xl font-black">Bộ đã lưu</h2>
				{sets.map((set) => (
					<Card key={set.id}>
						<CardContent className="flex items-center justify-between gap-3">
							<div>
								<p className="font-black">{set.title}</p>
								<p className="text-xs text-muted">{set.status === 'draft' ? 'Bản nháp' : 'Đã xuất bản'} · {set.items} mục · {set.learners} người học</p>
							</div>
							<div className="flex flex-wrap justify-end gap-2"><Link href={`/store`} className="inline-flex min-h-10 items-center rounded-control border border-border px-4 text-xs font-bold">Quản lý trên cửa hàng</Link><Button type="button" variant="secondary" disabled={busy} onClick={() => void publish(set.id)}>{set.status === 'draft' ? 'Xuất bản' : 'Xuất bản lại'}</Button></div>
						</CardContent>
					</Card>
				))}
			</section>
			</>}
		</div>
	);
}
