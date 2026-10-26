'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import EnglishAdminSettings from '@/components/english/EnglishAdminSettings';
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

interface DisputeRow {
	id: string;
	answer: string;
	expected: string;
	skill: string;
}

export default function EnglishAdmin({ sets, disputes, qaEnabled }: { sets: SetRow[]; disputes: DisputeRow[]; qaEnabled: boolean }) {
	const router = useRouter();
	const [text, setText] = useState('');
	const [issues, setIssues] = useState<Issue[]>([]);
	const [preview, setPreview] = useState<EnglishPackPreview | null>(null);
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const [panel, setPanel] = useState<'content' | 'activities' | 'blueprint' | 'qa'>('content');

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
				: `Xem trước: ${body.data?.drafts ?? 0} câu có thể đưa vào ôn nếu đủ audio.`);
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
			const body = await response.json() as { ok?: boolean; error?: string; data?: { issues?: Issue[]; publishedSenses?: number; publishedPatterns?: number } };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không xuất bản được');
			setIssues(body.data?.issues ?? []);
			setMessage(`Đã xuất bản ${body.data?.publishedSenses ?? 0} từ và ${body.data?.publishedPatterns ?? 0} mẫu. Câu thiếu audio hoặc còn mơ hồ được giữ lại.`);
			router.refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không xuất bản được');
		} finally {
			setBusy(false);
		}
	}

	async function resolve(disputeId: string, decision: 'accepted' | 'rejected') {
		setBusy(true);
		try {
			const response = await fetch('/api/admin/disputes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ disputeId, decision }),
			});
			const body = await response.json() as { ok?: boolean; error?: string };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không duyệt được');
			router.refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không duyệt được');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
			<header>
				<h1 className="text-3xl font-black text-foreground">Nội dung tiếng Anh</h1>
				<p className="mt-2 text-sm text-muted">Dán JSON do AI tạo. Câu thiếu nghĩa Việt, audio hoặc còn mơ hồ không vào phiên ôn. File audio phải nằm trong thư mục ENGLISH_AUDIO_ROOT, ngoài thư mục release.</p>
			</header>
			<div className="flex gap-2">
				<Button type="button" variant={panel === 'content' ? 'primary' : 'secondary'} onClick={() => setPanel('content')}>Nội dung</Button>
				<Button type="button" variant={panel === 'activities' ? 'primary' : 'secondary'} onClick={() => setPanel('activities')}>Dạng bài</Button>
				<Button type="button" variant={panel === 'blueprint' ? 'primary' : 'secondary'} onClick={() => setPanel('blueprint')}>Cấu trúc Test</Button>
				{qaEnabled && <Button type="button" variant={panel === 'qa' ? 'primary' : 'secondary'} onClick={() => setPanel('qa')}>Công cụ test</Button>}
			</div>
			{(panel === 'activities' || panel === 'blueprint') && <EnglishAdminSettings panel={panel} />}
			{panel === 'qa' && <EnglishAdminQaTools sets={sets} />}
			{panel === 'content' && <>
			<Card>
				<CardContent className="space-y-3">
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
							{preview.families.map((family) => (
								<p key={family.key} className="text-sm text-foreground-secondary">
									Họ {family.kind === 'root' ? 'gốc' : 'từ'} <span className="font-bold">{family.root}</span>
									{family.meaningVi ? ` · ${family.meaningVi}` : ''}: {family.members.map((member) => member.lemma).join(', ')}
								</p>
							))}
							{preview.words.map((word) => (
								<div key={`${word.senseKey || word.lemma}-${word.meaningVi}`} className="space-y-1 text-sm">
									<p className="font-black text-foreground">
										{word.lemma}
										{word.cefr ? <span className="ml-2 text-xs font-bold uppercase text-muted">{word.cefr === 'pre_a1' ? 'A0' : word.cefr}</span> : null}
									</p>
									<p className="text-muted">
										{[word.ipaUk && `Anh ${word.ipaUk}`, word.ipaUs && `Mỹ ${word.ipaUs}`, word.syllables.length > 0 && word.syllables.join('·')].filter(Boolean).join(' · ')}
									</p>
									<p>{word.meaningVi}</p>
									{word.definitionEn && <p className="text-foreground-secondary">{word.definitionEn}</p>}
									{word.definitionEnSimple && <p className="text-muted">{word.definitionEnSimple}</p>}
									{word.grammarNoteVi && <p className="text-muted">{word.grammarNoteVi}</p>}
									{word.hints.map((hint) => (
										<p key={`${word.lemma}-${hint.order}`} className="text-foreground-secondary">
											Gợi ý {hint.order} · {hint.kind}: {hint.textVi || hint.textEn}
										</p>
									))}
									{word.relations.map((relation) => (
										<p key={`${word.lemma}-${relation.kind}-${relation.lemma}`} className="text-foreground-secondary">
											{relation.kind}{relation.confusableType ? ` (${relation.confusableType})` : ''}: {relation.lemma}
											{relation.noteVi ? ` — ${relation.noteVi}` : ''}
										</p>
									))}
									{word.examples.filter((example) => example.targetStart != null).map((example) => (
										<p key={`${word.lemma}-${example.english}`} className="text-muted">
											Ví dụ “{example.target}”{example.targetTag ? ` · ${example.targetTag}` : ''} tại ký tự {example.targetStart}
										</p>
									))}
								</div>
							))}
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
							<Button type="button" variant="secondary" disabled={busy} onClick={() => void publish(set.id)}>Xuất bản</Button>
						</CardContent>
					</Card>
				))}
			</section>
			<section className="space-y-3">
				<h2 className="text-xl font-black">Đáp án đang chờ duyệt</h2>
				{disputes.length === 0 && <p className="text-sm text-muted">Không có báo cáo chờ.</p>}
				{disputes.map((dispute) => (
					<Card key={dispute.id}>
						<CardContent className="space-y-2">
							<p>Người học: <span className="font-bold">{dispute.answer}</span></p>
							<p className="text-sm text-muted">Đáp án mục tiêu: {dispute.expected} · {dispute.skill}</p>
							<div className="flex gap-2">
								<Button type="button" disabled={busy} onClick={() => void resolve(dispute.id, 'accepted')}>Chấp nhận</Button>
								<Button type="button" variant="secondary" disabled={busy} onClick={() => void resolve(dispute.id, 'rejected')}>Không chấp nhận</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</section>
			</>}
		</div>
	);
}
