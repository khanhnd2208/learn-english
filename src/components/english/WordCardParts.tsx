'use client';

import { useEffect, useRef, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import AdvancedNotes from '@/components/english/advanced/AdvancedNotes';
import WordFamily from '@/components/english/WordFamily';
import { exampleAudioUrl, playEnglishAudio, stopEnglishAudio, type PlaybackState } from '@/lib/englishAudio';
import { cardExampleOf, exampleParts, type BundleExample, type SenseBundle } from '@/lib/english/senseBundle';

/** Shared pieces of a word card, so study, review feedback and the set list read the same way. */
function ipaOf(bundle: SenseBundle): string { const ipa = bundle.word.ipa.trim(); return ipa ? (ipa.startsWith('/') ? ipa : `/${ipa}/`) : ''; }

function ExampleAudioButton({ example }: { example: BundleExample }) {
	const [state, setState] = useState<PlaybackState>('idle');
	const owner = useRef({});
	useEffect(() => {
		const self = owner.current;
		return () => stopEnglishAudio(self);
	}, []);
	const play = () => {
		if (state === 'loading') return;
		playEnglishAudio({ url: exampleAudioUrl(example.id), text: example.english.replace(/_{3,}/, example.target), owner: owner.current, onState: setState });
	};
	const icon = state === 'loading' ? 'progress_activity' : state === 'playing' ? 'graphic_eq' : state === 'failed' ? 'volume_off' : 'volume_up';
	return <button type="button" onClick={play} aria-busy={state === 'loading'} aria-label="Nghe câu ví dụ" title={state === 'failed' ? 'Không phát được — kiểm tra âm lượng/công tắc im lặng' : 'Nghe câu ví dụ'} className={`-mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-container hover:text-accent ${state === 'idle' ? 'text-muted' : 'text-accent'}`}><MaterialIcon name={icon} size={18} className={state === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''} /></button>;
}

function Example({ example }: { example: BundleExample }) {
	const parts = exampleParts(example);
	return <div className="flex items-start gap-2 rounded-panel border border-border/70 bg-surface-secondary px-3 py-2.5">
		<div className="min-w-0 flex-1">
			<p className="text-[15px] leading-relaxed text-foreground">{parts ? <>{parts.before}<mark className="rounded bg-accent-subtle px-0.5 font-bold text-accent">{parts.answer}</mark>{parts.after}</> : example.english}</p>
			{example.meaningVi && <p className="mt-1 text-sm text-muted">{example.meaningVi}</p>}
		</div>
		<ExampleAudioButton example={example} />
	</div>;
}

export function WordHeader({ bundle, autoPlay = false }: { bundle: SenseBundle; autoPlay?: boolean }) {
	return <div className="flex items-start justify-between gap-4">
		<div className="min-w-0">
			<p role="heading" aria-level={2} className="break-words font-sans text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{bundle.word.lemma}</p>
			<p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">{ipaOf(bundle) && <span className="font-mono">{ipaOf(bundle)}</span>}{bundle.sense.partOfSpeech && <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-bold">{bundle.sense.partOfSpeech}</span>}</p>
		</div>
		<EnglishAudioButton key={`${bundle.sense.id}-${autoPlay}`} compact autoPlay={autoPlay} senseId={bundle.sense.id} lemma={bundle.word.lemma} recordedAudioAvailable={Boolean(bundle.word.audioPath.trim())} />
	</div>;
}

/** Meaning, one example, note, near-synonyms and word family; fixed phrases only when "Nâng cao" is on. */
export function WordDetails({ bundle, showAdvanced = false }: { bundle: SenseBundle; showAdvanced?: boolean }) {
	const example = cardExampleOf(bundle.examples);
	return <div className="space-y-3">
		<p className="text-lg font-bold text-foreground">{bundle.sense.meaningVi}</p>
		{example && <Example example={example} />}
		{bundle.sense.noteVi && <p className="flex gap-2 rounded-panel border border-warning/30 bg-warning/5 px-3 py-2.5 text-sm text-foreground-secondary"><MaterialIcon name="lightbulb" size={18} className="mt-0.5 shrink-0 text-warning" /><span>{bundle.sense.noteVi}</span></p>}
		{bundle.sense.synonyms.length > 0 && <p className="text-sm text-muted"><span className="font-bold text-foreground-secondary">Gần nghĩa:</span> {bundle.sense.synonyms.join(', ')}</p>}
		<WordFamily family={bundle.sense.family} />
		<AdvancedNotes notes={bundle.sense.advanced} enabled={showAdvanced} />
	</div>;
}
