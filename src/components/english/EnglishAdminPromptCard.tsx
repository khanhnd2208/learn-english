'use client';

import { useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { buildAiPackPrompt } from '@/lib/english/aiPackPrompt';

/** Step 1 of import: build the AI prompt from a word list and copy it in one click. */
export default function EnglishAdminPromptCard() {
	const [title, setTitle] = useState('');
	const [words, setWords] = useState('');
	const [copied, setCopied] = useState('');
	const promptRef = useRef<HTMLTextAreaElement>(null);
	const prompt = useMemo(() => buildAiPackPrompt(words, title), [words, title]);
	const wordCount = words.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean).length;

	async function copy() {
		try {
			await navigator.clipboard.writeText(prompt);
			setCopied('Đã copy prompt. Dán vào ChatGPT hoặc Claude, rồi dán JSON AI trả về vào ô bước 2.');
		} catch {
			promptRef.current?.closest('details')?.setAttribute('open', '');
			promptRef.current?.select();
			setCopied('Trình duyệt chặn copy tự động. Prompt đã được bôi đen bên dưới, bấm Ctrl/Cmd + C.');
		}
	}

	return (
		<Card>
			<CardContent className="space-y-3">
				<div>
					<h2 className="text-lg font-black text-foreground">Bước 1 · Tạo prompt cho AI</h2>
					<p className="text-sm text-muted">Nhập danh sách từ, bấm Copy prompt, dán vào ChatGPT hoặc Claude. AI sẽ trả về JSON đúng định dạng để dán ở bước 2.</p>
				</div>
				<Input aria-label="Tên bộ từ" placeholder="Tên bộ (không bắt buộc), ví dụ: Motivation and Leadership" value={title} onChange={(event) => setTitle(event.target.value)} />
				<Textarea
					aria-label="Danh sách từ"
					placeholder={'Mỗi dòng một từ hoặc cụm từ, ví dụ:\nbelonging\nborrow\ngive up'}
					value={words}
					onChange={(event) => { setWords(event.target.value); setCopied(''); }}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" disabled={wordCount === 0} onClick={() => void copy()}>Copy prompt</Button>
					<span className="text-xs text-muted">{wordCount} từ</span>
				</div>
				{copied && <p className="text-sm text-foreground">{copied}</p>}
				<details className="text-sm">
					<summary className="cursor-pointer font-bold text-foreground-secondary">Xem toàn bộ prompt</summary>
					<textarea
						ref={promptRef}
						aria-label="Prompt cho AI"
						readOnly
						value={prompt}
						className="mt-2 min-h-64 w-full rounded-control border border-border bg-surface p-3 font-mono text-xs"
					/>
				</details>
			</CardContent>
		</Card>
	);
}
