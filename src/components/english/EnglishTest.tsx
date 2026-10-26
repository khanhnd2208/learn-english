'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import ProgressBar from '@/components/ui/ProgressBar';
import EnglishTestResult from '@/components/english/EnglishTestResult';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import { englishPost, englishSend } from '@/components/english/englishApi';
import type { EnglishTestItemView, EnglishTestStart, FinishedEnglishTest } from '@/lib/english/testTypes';

interface StartInfo {
	wordCount: number;
	openAttempt: { attemptId: string; wordCount: number; answeredCount: number; questionCount: number } | null;
}

function nowMs(): number { return Date.now(); }

export default function EnglishTest({ mode, setId, wordCount, studiedToday, onFinished, onRunningChange }: {
	mode: 'set' | 'mistakes' | 'review'; setId?: string; wordCount: number; studiedToday: number;
	onFinished?: (result: FinishedEnglishTest) => void; onRunningChange?: (running: boolean) => void;
}) {
	const [items, setItems] = useState<EnglishTestItemView[]>([]);
	const [attemptId, setAttemptId] = useState('');
	const [index, setIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [draft, setDraft] = useState('');
	const [result, setResult] = useState<FinishedEnglishTest | null>(null);
	const [info, setInfo] = useState<StartInfo | null>(null);
	const [confirmFinish, setConfirmFinish] = useState(false);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const startedAt = useRef<Record<string, number>>({});
	const current = items[index];
	const actualWords = info?.openAttempt?.wordCount ?? info?.wordCount ?? wordCount;
	const minutes = Math.max(1, Math.round((Math.max(actualWords, 1) * 2 * 12) / 60));

	useEffect(() => {
		let cancelled = false;
		const query = new URLSearchParams({ mode });
		if (setId) query.set('setId', setId);
		void englishSend<StartInfo>(`/api/test/start?${query}`, 'GET')
			.then((value) => { if (!cancelled) setInfo(value); })
			.catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không tải được bài kiểm tra'); });
		return () => { cancelled = true; };
	}, [mode, setId]);

	const restore = useCallback((started: EnglishTestStart) => {
		const restored = Object.fromEntries(started.items.flatMap((item) => item.answer != null ? [[item.id, item.answer]] : []));
		const firstBlank = started.items.findIndex((item) => !restored[item.id]?.trim());
		const nextIndex = firstBlank >= 0 ? firstBlank : 0;
		setAttemptId(started.attemptId); setItems(started.items); setAnswers(restored); setIndex(nextIndex);
		setDraft(started.items[nextIndex] ? restored[started.items[nextIndex]!.id] ?? '' : '');
		if (started.items[nextIndex]) startedAt.current[started.items[nextIndex]!.id] = nowMs();
		onRunningChange?.(true);
	}, [onRunningChange]);

	async function begin(restart = false) {
		setBusy(true); setError('');
		try { restore(await englishPost<EnglishTestStart>('/api/test/start', { mode, setId, restart })); }
		catch (reason) { setError(reason instanceof Error ? reason.message : 'Không mở được bài kiểm tra'); }
		finally { setBusy(false); }
	}

	async function save(item: EnglishTestItemView, value: string, at: number) {
		await englishPost('/api/test/answer', { attemptId, itemId: item.id, answer: value, responseMs: at - (startedAt.current[item.id] ?? at) });
		setAnswers((currentAnswers) => ({ ...currentAnswers, [item.id]: value }));
	}

	function go(next: number, savedAnswers = answers) {
		const clamped = Math.max(0, Math.min(items.length - 1, next));
		setIndex(clamped);
		const item = items[clamped];
		if (item && startedAt.current[item.id] === undefined) startedAt.current[item.id] = nowMs();
		setDraft(item ? savedAnswers[item.id] ?? '' : ''); setError('');
	}

	async function choose(value: string) {
		if (!current) return;
		setBusy(true); setError('');
		try { await save(current, value, nowMs()); go(Math.min(index + 1, items.length - 1), { ...answers, [current.id]: value }); }
		catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được câu trả lời. Hãy thử lại.'); }
		finally { setBusy(false); }
	}
	async function move(next: number) {
		if (!current) return;
		const typed = current.activityKey === 'recall_type' || current.activityKey === 'listen_type';
		setBusy(true);
		try { if (typed && draft !== (answers[current.id] ?? '')) await save(current, draft, nowMs()); go(next, { ...answers, [current.id]: draft }); }
		catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được câu trả lời. Hãy thử lại.'); }
		finally { setBusy(false); }
	}

	async function finish() {
		if (!current) return;
		setConfirmFinish(false); setBusy(true); setError('');
		try {
			if (draft !== (answers[current.id] ?? '') && (current.activityKey === 'recall_type' || current.activityKey === 'listen_type')) await save(current, draft, nowMs());
			const finished = await englishPost<FinishedEnglishTest>('/api/test/finish', { attemptId });
			setResult(finished); setItems([]); onRunningChange?.(false); onFinished?.(finished);
		} catch (reason) { setError(reason instanceof Error ? reason.message : 'Không nộp được bài'); }
		finally { setBusy(false); }
	}

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (!current || busy) return;
			const currentChoices = Array.isArray(current.prompt.choices) ? current.prompt.choices.filter((item): item is string => typeof item === 'string') : [];
			const digit = Number(event.key);
			if (digit >= 1 && digit <= currentChoices.length) { event.preventDefault(); void choose(currentChoices[digit - 1]!); }
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	if (result) return <EnglishTestResult result={result} />;
	if (!current) return <div className="space-y-4">
		<p className="text-xl font-black">{actualWords} từ · {actualWords * 2} câu · ~{minutes} phút</p>
		<p className="text-sm text-muted">Không có gợi ý và không biết đúng sai đến khi nộp. Mỗi từ có 1 câu nhận ra + 1 câu tự nhớ; đúng cả hai mới Đạt.</p>
		{studiedToday > 0 && <p className="text-sm text-warning">Các từ luyện hôm nay sẽ được ghi là vừa học. Làm lại từ ngày mai để được tính Đã nắm.</p>}
		{info?.openAttempt ? <div className="rounded-card border border-warning/30 bg-warning/10 p-4"><p className="font-black">Bạn có bài đang làm dở</p><p className="text-sm text-muted">Đã trả lời {info.openAttempt.answeredCount}/{info.openAttempt.questionCount} câu.</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void begin(false)}>Làm tiếp</Button><Button variant="secondary" disabled={busy} onClick={() => void begin(true)}>Làm bài mới</Button></div></div> : <Button disabled={busy || actualWords === 0} onClick={() => void begin(false)}>{mode === 'review' ? `Ôn tổng hợp (~${minutes} phút)` : 'Bắt đầu kiểm tra'}</Button>}
		{error && <p className="text-sm text-error">{error}</p>}
	</div>;

	const prompt = current.prompt;
	const choices = Array.isArray(prompt.choices) ? prompt.choices.filter((item): item is string => typeof item === 'string') : [];
	const typed = current.activityKey === 'recall_type' || current.activityKey === 'listen_type';
	const answeredCount = items.filter((item) => (item.id === current.id && typed ? draft : answers[item.id])?.trim()).length;
	const blankCount = items.length - answeredCount;
	return <div className="space-y-4">
		<div className="flex items-center justify-between text-sm text-muted"><span>Đã trả lời {answeredCount}/{items.length}</span><span>Câu {index + 1}</span></div>
		<ProgressBar value={answeredCount} max={items.length} />
		<div className="flex flex-wrap gap-2" aria-label="Danh sách câu hỏi">{items.map((item, itemIndex) => <button key={item.id} type="button" onClick={() => void move(itemIndex)} className={`h-9 w-9 rounded-control border text-xs font-bold focus-visible:ring-2 focus-visible:ring-accent ${itemIndex === index ? 'border-accent bg-accent text-accent-foreground' : answers[item.id]?.trim() ? 'border-success bg-success-subtle text-success' : 'border-border bg-surface text-muted'}`}>{itemIndex + 1}</button>)}</div>
		<Card><CardContent className="space-y-4">
			{typeof prompt.lemma === 'string' && <p className="text-3xl font-black">{prompt.lemma}</p>}
			{typeof prompt.meaningVi === 'string' && current.activityKey !== 'meaning_choice' && current.activityKey !== 'listen_choice' && <p className="text-lg">{prompt.meaningVi}</p>}
			{typeof prompt.before === 'string' && <p className="text-lg">{prompt.before}_____ {String(prompt.after ?? '')}</p>}
			{(current.activityKey === 'listen_choice' || current.activityKey === 'listen_type') && <EnglishAudioButton key={current.id} senseId={String(prompt.senseId ?? '')} allowTts={false} recordedAudioAvailable />}
			{choices.map((choice, choiceIndex) => <Button key={choice} type="button" fullWidth variant={answers[current.id] === choice ? 'primary' : 'secondary'} disabled={busy} onClick={() => void choose(choice)}><span className="mr-auto">{choiceIndex + 1}. {choice}</span></Button>)}
			{typed && <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void choose(draft); }}><input autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Từ tiếng Anh" value={draft} onChange={(event) => setDraft(event.target.value)} className="h-10 flex-1 rounded-control border border-border bg-surface px-3" /><Button type="submit" disabled={busy}>Tiếp</Button></form>}
		</CardContent></Card>
		<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={index === 0 || busy} onClick={() => void move(index - 1)}>Câu trước</Button>{index < items.length - 1 && <Button variant="secondary" disabled={busy} onClick={() => void move(index + 1)}>Câu sau</Button>}<Button className="ml-auto" disabled={busy} onClick={() => blankCount > 0 ? setConfirmFinish(true) : void finish()}>Nộp bài</Button></div>
		{error && <div className="rounded-control bg-error/10 p-3 text-sm text-error">{error}</div>}
		<Dialog open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Nộp bài kiểm tra?" description={`Còn ${blankCount} câu chưa trả lời — các câu này tính là sai.`}><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmFinish(false)}>Làm tiếp</Button><Button onClick={() => void finish()}>Vẫn nộp bài</Button></div></Dialog>
	</div>;
}
