'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import { useActiveTimer } from '@/components/english/useActiveTimer';
import { activityByKey, poolFromBundles, randomRng, type ActivityItem, type ActivityKey } from '@/lib/english/activities';
import { explainMiss } from '@/lib/english/explain';
import { initialPracticeQueue, queueAfterAnswer, takePracticeStep, type PracticeStep } from '@/lib/english/practiceLoop';
import type { SenseBundle } from '@/lib/english/senseBundle';
import { englishPost } from '@/components/english/englishApi';

interface StartPayload { sessionId: string; activityKey: string | null; bundles: SenseBundle[]; }
interface PracticeProps {
	mode: 'set' | 'mistakes'; setId?: string;
	activities: Array<{ key: string; label: string; role: string; inPractice: boolean }>;
	onRunningChange?: (running: boolean) => void;
	onNavigateTab?: (tab: 'test' | 'read') => void;
}

const ACTIVITY_META: Record<string, { icon: string; description: string }> = {
	meaning_choice: { icon: 'translate', description: 'Nhìn từ và chọn đúng nghĩa tiếng Việt.' },
	listen_choice: { icon: 'headphones', description: 'Nghe phát âm rồi chọn nghĩa.' },
	cloze_choice: { icon: 'format_quote', description: 'Chọn từ phù hợp với câu.' },
	match_pairs: { icon: 'join_inner', description: 'Ghép 5 từ với 5 nghĩa.' },
	spell_hinted: { icon: 'spellcheck', description: 'Viết từ với chữ đầu và số chữ.' },
	recall_type: { icon: 'edit', description: 'Tự nhớ và gõ từ cần tìm.' },
	listen_type: { icon: 'hearing', description: 'Nghe rồi gõ lại từ.' },
	speak_shadow: { icon: 'mic', description: 'Nghe, ghi âm và tự so sánh.' },
};

function formatDuration(seconds: number) { return seconds < 60 ? `${seconds} giây` : `${Math.round(seconds / 60)} phút`; }

export default function EnglishPractice({ mode, setId, activities, onRunningChange, onNavigateTab }: PracticeProps) {
	const choices = activities.filter((activity) => activity.inPractice);
	const [activityKey, setActivityKey] = useState('');
	const [bundles, setBundles] = useState<SenseBundle[]>([]);
	const [queue, setQueue] = useState<PracticeStep[]>([]);
	const [card, setCard] = useState<ActivityItem | null>(null);
	const [answer, setAnswer] = useState('');
	const [pairs, setPairs] = useState<Array<{ lemma: string; meaning: string }>>([]);
	const [pickedLemma, setPickedLemma] = useState('');
	const [feedback, setFeedback] = useState<{ correct: boolean; chosen: string; message: string } | null>(null);
	const [wrongPairLemmas, setWrongPairLemmas] = useState<string[]>([]);
	const [hintCount, setHintCount] = useState(0);
	const [recording, setRecording] = useState<MediaRecorder | null>(null);
	const [replayUrl, setReplayUrl] = useState('');
	const [error, setError] = useState('');
	const [phase, setPhase] = useState<'pick' | 'running' | 'saving' | 'summary'>('pick');
	const [busy, setBusy] = useState(false);
	const [mistakeCount, setMistakeCount] = useState(0);
	const [durationSeconds, setDurationSeconds] = useState(0);
	const [seenCount, setSeenCount] = useState(0);
	const [completedCount, setCompletedCount] = useState(0);
	const seen = useRef(new Set<string>());
	const completed = useRef(new Set<string>());
	const recorderStream = useRef<MediaStream | null>(null);
	const advanceTimer = useRef<number | null>(null);
	const finished = useRef(false);
	const sessionRef = useRef('');
	const seenRef = useRef(new Set<string>());
	const getActiveSeconds = useActiveTimer(phase === 'running' || phase === 'saving');
	const path = activityKey === '';

	function bundleOf(senseId: string) { return bundles.find((bundle) => bundle.sense.id === senseId) ?? null; }

	const sendBeacon = useCallback(() => {
		if (!sessionRef.current || finished.current) return;
		const body = JSON.stringify({ sessionId: sessionRef.current, activeSeconds: getActiveSeconds(), senseIds: [...seenRef.current] });
		navigator.sendBeacon('/api/practice/finish', new Blob([body], { type: 'application/json' }));
		finished.current = true;
	}, [getActiveSeconds]);

	useEffect(() => {
		const pageHide = () => sendBeacon();
		window.addEventListener('pagehide', pageHide);
		return () => {
			window.removeEventListener('pagehide', pageHide);
			if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
			recorderStream.current?.getTracks().forEach((track) => track.stop());
			sendBeacon();
		};
	}, [sendBeacon]);

	useEffect(() => () => { if (replayUrl) URL.revokeObjectURL(replayUrl); }, [replayUrl]);

	async function persistFinish() {
		if (!sessionRef.current) return;
		const seconds = getActiveSeconds();
		await englishPost('/api/practice/finish', { sessionId: sessionRef.current, activeSeconds: seconds, senseIds: [...seenRef.current] });
		finished.current = true; setDurationSeconds(seconds); setPhase('summary'); setCard(null); onRunningChange?.(false);
	}

	function draw(nextQueue: PracticeStep[], source: SenseBundle[], usingPath: boolean) {
		const pool = poolFromBundles(source);
		let pending = nextQueue;
		for (let guard = 0; guard < 40; guard += 1) {
			const taken = takePracticeStep(pending);
			if (!taken.current) { setQueue([]); setCard(null); setPhase('saving'); void persistFinish().catch((reason) => { setError(reason instanceof Error ? reason.message : 'Không lưu được phiên luyện'); }); return; }
			const sense = source.find((bundle) => bundle.sense.id === taken.current?.senseId);
			const activity = activityByKey(taken.current.activityKey);
			const built = sense && activity ? activity.build(sense, { pool, rng: randomRng(), allowSyntheticAudio: true }) : null;
			if (built) {
				seen.current.add(built.senseId); seenRef.current = new Set(seen.current); setSeenCount(seen.current.size); setQueue(taken.queue); setCard(built);
				setAnswer(''); setPairs([]); setPickedLemma(''); setFeedback(null); setWrongPairLemmas([]); setHintCount(0);
				if (replayUrl) { URL.revokeObjectURL(replayUrl); setReplayUrl(''); }
				return;
			}
			pending = queueAfterAnswer(taken.queue, taken.current, true, usingPath);
		}
		setError('Không dựng được dạng luyện này với nội dung hiện có.'); setPhase('pick'); onRunningChange?.(false);
	}

	async function begin() {
		setBusy(true); setError(''); setMistakeCount(0); completed.current = new Set(); finished.current = false;
		try {
			const started = await englishPost<StartPayload>('/api/practice/start', { mode, setId, activityKey: activityKey || null });
			sessionRef.current = started.sessionId; setBundles(started.bundles); seen.current = new Set(); seenRef.current = new Set(); setSeenCount(0); setCompletedCount(0);
			setPhase('running'); onRunningChange?.(true);
			draw(initialPracticeQueue(started.bundles.map((bundle) => bundle.sense.id), (started.activityKey as ActivityKey | null) ?? null), started.bundles, !started.activityKey);
		} catch (reason) { setError(reason instanceof Error ? reason.message : 'Không mở được phiên luyện'); setPhase('pick'); onRunningChange?.(false); }
		finally { setBusy(false); }
	}

	async function stop() {
		setBusy(true); setPhase('saving');
		try { await persistFinish(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được phiên luyện'); }
		finally { setBusy(false); }
	}

	function continueAfter(correct: boolean) {
		if (!card) return;
		const currentStep: PracticeStep = { senseId: card.senseId, activityKey: card.activityKey, delay: 0 };
		const next = queueAfterAnswer(queue, currentStep, correct, path);
		if (!next.some((step) => step.senseId === card.senseId)) { completed.current.add(card.senseId); setCompletedCount(completed.current.size); }
		if (next.length === 0) { setCard(null); setPhase('saving'); void persistFinish().catch((reason) => setError(reason instanceof Error ? reason.message : 'Không lưu được phiên luyện')); return; }
		draw(next, bundles, path);
	}

	function submit(value: string) {
		if (!card || feedback) return;
		const activity = activityByKey(card.activityKey);
		const correct = activity?.grade ? activity.grade(card, value) : true;
		if (correct) {
			setFeedback({ correct: true, chosen: value, message: 'Đúng.' });
			advanceTimer.current = window.setTimeout(() => continueAfter(true), 900);
		} else {
			setMistakeCount((count) => count + 1);
			const sense = bundleOf(card.senseId);
			setFeedback({ correct: false, chosen: value, message: sense ? `Đáp án: ${card.answerKey}. ${explainMiss(sense)}` : `Đáp án: ${card.answerKey}` });
			if (card.activityKey === 'match_pairs') {
				const correctPairs = new Set(card.answerKey.split('|').map((part) => part.trim().toLowerCase()));
				setWrongPairLemmas(pairs.filter((pair) => !correctPairs.has(`${pair.lemma.trim().toLowerCase()}=${pair.meaning.trim().toLowerCase()}`)).map((pair) => pair.lemma));
			}
		}
	}

	async function toggleRecord() {
		if (recording) { recording.stop(); setRecording(null); return; }
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorderStream.current = stream;
			const recorder = new MediaRecorder(stream); const chunks: Blob[] = [];
			recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
			recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); recorderStream.current = null; const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })); setReplayUrl((old) => { if (old) URL.revokeObjectURL(old); return url; }); };
			recorder.start(); setRecording(recorder);
		} catch { setError('Trình duyệt chưa cho dùng micro. Hãy kiểm tra quyền truy cập rồi thử lại.'); }
	}

	const sense = card ? bundleOf(card.senseId) : null;
	const prompt = card?.prompt ?? {};
	const choiceList = Array.isArray(prompt.choices) ? prompt.choices.filter((item): item is string => typeof item === 'string') : [];
	const lemmas = Array.isArray(prompt.lemmas) ? prompt.lemmas.filter((item): item is string => typeof item === 'string') : [];
	const meanings = Array.isArray(prompt.meanings) ? prompt.meanings.filter((item): item is string => typeof item === 'string') : [];

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (phase !== 'running' || !card) return;
			const digit = Number(event.key);
			if (!feedback && digit >= 1 && digit <= choiceList.length) { event.preventDefault(); submit(choiceList[digit - 1]!); }
			if (event.key === 'Enter' && feedback && !feedback.correct) { event.preventDefault(); continueAfter(false); }
		};
		window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
	});

	if (phase === 'pick') return <div className="space-y-4">
		<div><h2 className="text-xl font-black">Chọn cách luyện</h2><p className="text-sm text-muted">Lộ trình phối hợp nhiều dạng và được đề xuất cho lần học đầu.</p></div>
		<div className="grid gap-3 sm:grid-cols-2">
			<button type="button" onClick={() => setActivityKey('')} className={`rounded-card border p-4 text-left focus-visible:ring-2 focus-visible:ring-accent ${activityKey === '' ? 'border-accent bg-accent-subtle' : 'border-border bg-surface'}`}><MaterialIcon name="route" /><p className="mt-2 font-black">Lộ trình <span className="text-xs text-accent">· Đề xuất</span></p><p className="text-sm text-muted">Đi từ nhận ra đến tự nhớ theo từng từ.</p></button>
			{choices.map((activity) => { const meta = ACTIVITY_META[activity.key] ?? { icon: 'quiz', description: 'Luyện riêng dạng bài này.' }; return <button key={activity.key} type="button" onClick={() => setActivityKey(activity.key)} className={`rounded-card border p-4 text-left focus-visible:ring-2 focus-visible:ring-accent ${activityKey === activity.key ? 'border-accent bg-accent-subtle' : 'border-border bg-surface'}`}><MaterialIcon name={meta.icon} /><p className="mt-2 font-black">{activity.label}</p><p className="text-sm text-muted">{meta.description}</p></button>; })}
		</div>
		<Button loading={busy} onClick={() => void begin()}>Bắt đầu luyện</Button>{error && <p className="text-sm text-error">{error}</p>}
	</div>;

	if (phase === 'summary' || phase === 'saving') return <div className="space-y-4 rounded-card border border-border bg-surface p-6">
		<h2 className="text-2xl font-black">{phase === 'saving' ? 'Đang lưu phiên luyện…' : 'Hoàn thành phiên luyện'}</h2>
		{phase === 'summary' && <><div className="grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-black">{seenCount}</p><p className="text-xs text-muted">Từ đã gặp</p></div><div><p className="text-2xl font-black">{mistakeCount}</p><p className="text-xs text-muted">Lần sai</p></div><div><p className="text-2xl font-black">{formatDuration(durationSeconds)}</p><p className="text-xs text-muted">Hoạt động</p></div></div><p className="text-sm text-muted">Kiểm tra từ ngày mai để kết quả được tính Đã nắm.</p><div className="flex flex-wrap gap-2">{setId && <Button onClick={() => onNavigateTab?.('test')}>Kiểm tra bộ này</Button>}<Button variant="secondary" onClick={() => { sessionRef.current = ''; setPhase('pick'); }}>Luyện lại</Button>{onNavigateTab ? <Button variant="tertiary" onClick={() => onNavigateTab('read')}>Về bộ từ</Button> : <Link href="/"><Button variant="tertiary">Về bộ từ</Button></Link>}</div></>}
		{error && <div className="space-y-2"><p className="text-sm text-error">{error}</p><Button disabled={busy} onClick={() => void stop()}>Thử lưu lại</Button></div>}
	</div>;

	return <div className="space-y-4">
		<div className="flex items-center justify-between gap-3"><div className="flex-1"><p className="text-sm font-bold">Đã xong {completedCount}/{bundles.length} từ</p><ProgressBar value={completedCount} max={Math.max(1, bundles.length)} className="mt-2" /></div><Button variant="secondary" disabled={busy} onClick={() => void stop()}>Dừng</Button></div>
		{card && <Card><CardContent className="space-y-4">
			<p className="label-caps">{activityByKey(card.activityKey)?.label ?? card.activityKey}</p>
			{typeof prompt.lemma === 'string' && card.activityKey !== 'speak_shadow' && <p className="text-3xl font-black">{prompt.lemma}</p>}
			{typeof prompt.ipa === 'string' && prompt.ipa && <p className="text-sm text-muted">{prompt.ipa}</p>}
			{typeof prompt.meaningVi === 'string' && card.activityKey !== 'meaning_choice' && card.activityKey !== 'listen_choice' && <p className="text-lg">{prompt.meaningVi}</p>}
			{(card.activityKey === 'listen_choice' || card.activityKey === 'listen_type' || card.activityKey === 'speak_shadow') && sense && <EnglishAudioButton key={`${card.senseId}-${card.activityKey}`} senseId={card.senseId} lemma={sense.word.lemma} recordedAudioAvailable={Boolean(sense.word.audioPath.trim() || sense.word.audioUkPath.trim() || sense.word.audioUsPath.trim())} />}
			{card.activityKey === 'spell_hinted' && <p className="text-sm text-muted">Bắt đầu bằng {String(prompt.firstLetter)} · {String(prompt.letterCount)} chữ</p>}
			{(card.activityKey === 'cloze_choice' || prompt.mode === 'cloze') && <p className="text-lg">{String(prompt.before)}_____ {String(prompt.after)}</p>}
			{choiceList.length > 0 && <div className="grid gap-2">{choiceList.map((choice, index) => { const correct = feedback && choice === card.answerKey; const chosenWrong = feedback && !feedback.correct && choice === feedback.chosen; return <Button key={choice} fullWidth variant="secondary" aria-disabled={Boolean(feedback)} className={correct ? 'border-success bg-success-subtle text-success' : chosenWrong ? 'border-error bg-error/10 text-error' : ''} onClick={() => submit(choice)}><span className="mr-auto">{index + 1}. {choice}</span></Button>; })}</div>}
			{card.activityKey === 'match_pairs' && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2">{lemmas.filter((lemma) => !pairs.some((pair) => pair.lemma === lemma)).map((lemma) => <Button key={lemma} variant={pickedLemma === lemma ? 'primary' : 'secondary'} onClick={() => setPickedLemma(lemma)}>{lemma}</Button>)}</div><div className="space-y-2">{meanings.filter((meaning) => !pairs.some((pair) => pair.meaning === meaning)).map((meaning) => <Button key={meaning} variant="secondary" disabled={!pickedLemma} onClick={() => { setPairs((currentPairs) => [...currentPairs, { lemma: pickedLemma, meaning }]); setPickedLemma(''); }}>{meaning}</Button>)}</div></div>{pairs.length > 0 && <div className="space-y-2">{pairs.map((pair) => <button key={pair.lemma} type="button" disabled={Boolean(feedback)} onClick={() => setPairs((currentPairs) => currentPairs.filter((item) => item.lemma !== pair.lemma))} className={`block w-full rounded-control border p-2 text-left text-sm ${wrongPairLemmas.includes(pair.lemma) ? 'border-error bg-error/10' : 'border-border'}`}>{pair.lemma} ↔ {pair.meaning} <span className="text-muted">· bấm để gỡ</span></button>)}</div>}{pairs.length === 5 && !feedback && <Button onClick={() => submit(pairs.map((pair) => `${pair.lemma}=${pair.meaning}`).join('|'))}>Chấm các cặp</Button>}</div>}
			{(card.activityKey === 'spell_hinted' || card.activityKey === 'recall_type' || card.activityKey === 'listen_type') && <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); submit(answer); }}><input autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={Boolean(feedback)} aria-label="Từ tiếng Anh" value={answer} onChange={(event) => setAnswer(event.target.value)} className="h-10 flex-1 rounded-control border border-border bg-surface px-3" /><Button type="submit" disabled={Boolean(feedback)}>Trả lời</Button></form>}
			{card.activityKey === 'speak_shadow' && <div className="space-y-2"><p className="text-3xl font-black">{String(prompt.lemma)}</p><Button variant="secondary" onClick={() => void toggleRecord()}>{recording ? 'Dừng ghi' : 'Ghi âm'}</Button>{replayUrl && <audio controls src={replayUrl} className="w-full"><track kind="captions" /></audio>}<Button onClick={() => continueAfter(true)}>Đã tự so</Button></div>}
			{feedback && <div className={`space-y-2 rounded-control p-3 text-sm ${feedback.correct ? 'bg-success-subtle text-success' : 'bg-error/10'}`}><p className="font-bold">{feedback.message}</p>{sense && hintCount > 0 && <ol>{sense.hints.slice(0, hintCount).map((hint) => <li key={hint.id}>{hint.order}. {hint.textVi || hint.textEn}</li>)}</ol>}<div className="flex flex-wrap gap-2">{sense && hintCount < sense.hints.length && <Button variant="tertiary" onClick={() => setHintCount((count) => count + 1)}>Tôi là ai?</Button>}{!feedback.correct && <Button onClick={() => continueAfter(false)}>Tiếp tục</Button>}</div></div>}
		</CardContent></Card>}
		{error && <p className="text-sm text-error">{error}</p>}
	</div>;
}
