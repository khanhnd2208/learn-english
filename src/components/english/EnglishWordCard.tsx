'use client';

import { useState } from 'react';
import type { SenseBundle } from '@/lib/english/senseBundle';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';

const TABS = ['Cách nói', 'Phân biệt', 'Ví dụ', 'Tôi là ai?'] as const;

export default function EnglishWordCard({ bundle }: { bundle: SenseBundle }) {
	const [tab, setTab] = useState<(typeof TABS)[number]>('Cách nói');
	const ipa = bundle.sense.ipaOverride || bundle.word.ipaUk || bundle.word.ipaUs || bundle.word.ipa;
	const hasRecordedAudio = Boolean(bundle.word.audioPath.trim() || bundle.word.audioUkPath.trim() || bundle.word.audioUsPath.trim());
	const contrasts = bundle.relations.filter((relation) => relation.kind === 'confusable');
	return (
		<div className="space-y-4">
			<div>
				<p className="text-3xl font-black text-foreground">{bundle.word.lemma}</p>
				<p className="text-sm text-muted">{ipa} · {bundle.sense.partOfSpeech}</p>
				<p className="mt-2 text-foreground">{bundle.sense.meaningVi}</p>
				{bundle.sense.definitionEnSimple && <p className="text-sm text-foreground-secondary">{bundle.sense.definitionEnSimple}</p>}
			</div>
			<EnglishAudioButton senseId={bundle.sense.id} lemma={bundle.word.lemma} recordedAudioAvailable={hasRecordedAudio} />
			<div className="flex gap-1 overflow-x-auto border-b border-border">
				{TABS.map((name) => (
					<button
						key={name}
						type="button"
						onClick={() => setTab(name)}
						className={`shrink-0 px-3 py-2 text-xs font-bold ${tab === name ? 'border-b-2 border-accent text-accent' : 'text-muted'}`}
					>
						{name}
					</button>
				))}
			</div>
			{tab === 'Cách nói' && (
				<ul className="space-y-2 text-sm">
					{bundle.sense.chunks.map((chunk) => (
						<li key={chunk.text}>
							<p className="font-bold text-foreground">{chunk.text}</p>
							{chunk.vi && <p className="text-muted">{chunk.vi}</p>}
						</li>
					))}
					{bundle.sense.grammarNoteVi && <li className="text-foreground-secondary">{bundle.sense.grammarNoteVi}</li>}
					{bundle.sense.chunks.length === 0 && !bundle.sense.grammarNoteVi && <li className="text-muted">Chưa có cách nói.</li>}
				</ul>
			)}
			{tab === 'Phân biệt' && (
				<ul className="space-y-3 text-sm">
					{bundle.sense.commonErrors.map((error) => (
						<li key={error.wrong} className="rounded-control bg-surface-container p-3">
							<p className="text-error">{error.wrong}</p>
							<p className="text-success">{error.right}</p>
							<p className="text-muted">{error.whyVi}</p>
						</li>
					))}
					{bundle.sense.pitfallVi && <li className="text-foreground-secondary">{bundle.sense.pitfallVi}</li>}
					{contrasts.map((relation) => (
						<li key={relation.id} className="space-y-1">
							<p className="font-bold">{relation.lemma}</p>
							{relation.noteVi && <p className="text-muted">{relation.noteVi}</p>}
							{relation.contrast.map((side) => (
								<p key={side.lemma}>{side.lemma}: {side.en} — {side.vi}</p>
							))}
							{relation.mistake && <p className="text-foreground-secondary">{relation.mistake.wrong} → {relation.mistake.right}</p>}
						</li>
					))}
					{bundle.sense.commonErrors.length === 0 && !bundle.sense.pitfallVi && contrasts.length === 0 && (
						<li className="text-muted">Chưa có lỗi hay gặp.</li>
					)}
				</ul>
			)}
			{tab === 'Ví dụ' && (
				<ul className="space-y-2 text-sm">
					{bundle.examples.map((example) => (
						<li key={example.id}>
							<p className="font-bold">{example.english}</p>
							<p className="text-muted">{example.meaningVi}</p>
						</li>
					))}
					{bundle.examples.length === 0 && <li className="text-muted">Chưa có ví dụ.</li>}
				</ul>
			)}
			{tab === 'Tôi là ai?' && (
				<ol className="space-y-2 text-sm">
					{bundle.hints.map((hint) => (
						<li key={hint.id}>
							<p>{hint.order}. {hint.textVi || hint.textEn}</p>
						</li>
					))}
					{bundle.hints.length === 0 && <li className="text-muted">Chưa có gợi ý.</li>}
				</ol>
			)}
		</div>
	);
}
