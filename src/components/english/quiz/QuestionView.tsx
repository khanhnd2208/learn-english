'use client';

import { useEffect, useRef, useState } from 'react';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';

export type PublicQuestion = { position: number; activityKey: string; prompt: Record<string, unknown>; answer?: string | null };
export type QuestionFeedback = { answer: string; correct: boolean; expected: string };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

function Prompt({ item }: { item: PublicQuestion }) {
	const prompt = item.prompt;
	const senseId = text(prompt.senseId);
	if (item.activityKey === 'listen_type') {
		return <>
			<div className="flex justify-center"><EnglishAudioButton key={item.position} compact autoPlay senseId={senseId} recordedAudioAvailable /></div>
			<p className="mt-3 text-sm text-muted">Nghe và gõ lại từ tiếng Anh</p>
		</>;
	}
	if (item.activityKey === 'cloze_choice') {
		return <>
			<p className="text-sm text-muted">Chọn từ còn thiếu</p>
			<p className="mt-3 text-2xl font-bold">{text(prompt.before)} ____ {text(prompt.after)}</p>
			<p className="mt-2 text-sm text-muted">{text(prompt.meaningVi)}</p>
		</>;
	}
	if (item.activityKey === 'meaning_choice') {
		return <>
			<p className="text-sm text-muted">Chọn nghĩa đúng</p>
			<p role="heading" aria-level={2} className="mt-3 text-4xl font-black">{text(prompt.lemma)}</p>
			{text(prompt.ipa) && <p className="mt-1 font-mono text-sm text-muted">{text(prompt.ipa)}</p>}
			<div className="mt-3 flex justify-center"><EnglishAudioButton compact senseId={senseId} lemma={text(prompt.lemma)} recordedAudioAvailable /></div>
		</>;
	}
	return <>
		<p className="text-sm text-muted">Gõ từ tiếng Anh có nghĩa là</p>
		<p role="heading" aria-level={2} className="mt-3 text-3xl font-black">{text(prompt.meaningVi)}</p>
		{text(prompt.partOfSpeech) && <p className="mt-1 text-sm text-muted">{text(prompt.partOfSpeech)}</p>}
	</>;
}

/** One question of any quiz kind, shared by ungraded practice and graded tests. */
export default function QuestionView({ item, onAnswer, disabled = false, feedback }: {
	item: PublicQuestion;
	onAnswer: (answer: string) => void;
	disabled?: boolean;
	feedback?: QuestionFeedback | null;
}) {
	const [typed, setTyped] = useState('');
	const submitted = useRef(false);
	const choices = Array.isArray(item.prompt.choices) ? item.prompt.choices.filter((value): value is string => typeof value === 'string') : [];
	const isChoice = item.activityKey === 'meaning_choice' || item.activityKey === 'cloze_choice';
	const locked = disabled || Boolean(feedback);

	function send(answer: string) {
		if (locked || submitted.current) return;
		submitted.current = true;
		onAnswer(answer);
	}

	useEffect(() => {
		if (!isChoice || locked) return;
		const onKey = (event: KeyboardEvent) => {
			const index = Number(event.key) - 1;
			if (index >= 0 && index < choices.length) send(choices[index]!);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const stateOf = (option: string) => {
		if (!feedback) return undefined;
		if (option === feedback.expected) return 'correct';
		return option === feedback.answer ? 'wrong' : undefined;
	};

	return <div className="space-y-6 rounded-panel border border-border bg-surface p-5 sm:p-8">
		<div className="text-center"><Prompt item={item} /></div>
		{isChoice
			? <div className="grid gap-2">
				{choices.map((option, index) => <button key={option} type="button" disabled={locked} onClick={() => send(option)} className="choice-btn" data-state={stateOf(option)}>
					<span className="mr-3 text-muted">{index + 1}.</span>{option}
				</button>)}
			</div>
			: <form onSubmit={(event) => { event.preventDefault(); if (typed.trim()) send(typed); }} className="space-y-3">
				<input autoFocus value={typed} onChange={(event) => setTyped(event.target.value)} disabled={locked} aria-label="Gõ từ tiếng Anh" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="min-h-14 w-full rounded-control border-2 border-border bg-background px-4 text-center text-xl outline-none focus:border-accent" />
				{feedback && !feedback.correct && <p className="text-center text-sm">Bạn gõ: <s className="text-error">{feedback.answer || '—'}</s></p>}
				<button type="submit" disabled={!typed.trim() || locked} className="min-h-11 w-full rounded-control bg-accent px-4 font-bold text-accent-foreground disabled:opacity-50">Trả lời</button>
			</form>}
	</div>;
}
