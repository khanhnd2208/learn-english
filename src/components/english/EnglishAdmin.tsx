'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import EnglishAdminPromptCard from '@/components/english/EnglishAdminPromptCard';
import EnglishAdminQaTools from '@/components/english/EnglishAdminQaTools';
import type { EnglishPackPreview } from '@/lib/english/packPreview';
import { sampleEnglishPack } from '@/lib/english/samplePack';

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

export default function EnglishAdmin({ sets, qaEnabled }: { sets: SetRow[]; qaEnabled: boolean }) {
	const router = useRouter();
	const [text, setText] = useState('');
	const [issues, setIssues] = useState<Issue[]>([]);
	const [preview, setPreview] = useState<EnglishPackPreview | null>(null);
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const [panel, setPanel] = useState<'content' | 'qa'>('content');

	async function send(action: 'preview' | 'save') {
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
			setMessage(action === 'save'
				? `Đã lưu bản nháp${body.data?.setId ? ` ${body.data.setId}` : ''}.`
				: `Xem trước: ${body.data?.drafts ?? 0} từ đủ điều kiện xuất bản.`);
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
			const response = await fetch('/api/admin/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setId }),
			});
			const body = await response.json() as { ok?: boolean; error?: string; data?: { issues?: Issue[]; publishedSenses?: number } };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không xuất bản được');
			setIssues(body.data?.issues ?? []);
			setMessage(`Đã xuất bản ${body.data?.publishedSenses ?? 0} từ. Từ còn thiếu trường bắt buộc được giữ lại.`);
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
				{qaEnabled && <Button type="button" variant={panel === 'qa' ? 'primary' : 'secondary'} onClick={() => setPanel('qa')}>Công cụ test</Button>}
			</div>
			{panel === 'qa' && <EnglishAdminQaTools sets={sets} />}
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
						<Button type="button" disabled={busy || !text.trim()} onClick={() => void send('save')}>Lưu bản nháp</Button>
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
                                {word.examples.map((example, index) => <p key={index} className="text-muted">{example.english} — {example.meaningVi}</p>)}
                                {word.examples.some((example) => example.gradable) && <div className="rounded-control bg-accent-subtle p-3"><p className="font-bold">Câu dùng để chấm</p>{word.examples.filter((example) => example.gradable).map((example, index) => <p key={index}><strong>{example.english}</strong> — {example.meaningVi}</p>)}</div>}
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
								<p className="text-xs text-muted">{set.status} · {set.items} mục · {set.learners} người học</p>
							</div>
							<div className="flex flex-wrap justify-end gap-2"><Link href={`/store`} className="inline-flex min-h-10 items-center rounded-control border border-border px-4 text-xs font-bold">Quản lý trên cửa hàng</Link><Button type="button" variant="secondary" disabled={busy} onClick={() => void publish(set.id)}>Xuất bản</Button></div>
						</CardContent>
					</Card>
				))}
			</section>
			</>}
		</div>
	);
}
