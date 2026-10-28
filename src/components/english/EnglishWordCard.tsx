'use client';
import { cardExampleOf, exampleParts, type SenseBundle } from '@/lib/english/senseBundle';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import AdvancedNotes from '@/components/english/advanced/AdvancedNotes';
import WordFamily from '@/components/english/WordFamily';

/** Study card: one example only — the other sentences are kept hidden for questions. */
export default function EnglishWordCard({ bundle }: { bundle: SenseBundle }) {
 const example = cardExampleOf(bundle.examples), parts = example && exampleParts(example);
 return <div className="space-y-4">
  <div><p className="text-3xl font-black text-foreground">{bundle.word.lemma}</p><p className="text-sm text-muted">{bundle.word.ipa} · ({bundle.sense.partOfSpeech})</p></div>
  <EnglishAudioButton senseId={bundle.sense.id} lemma={bundle.word.lemma} recordedAudioAvailable={Boolean(bundle.word.audioPath.trim())} />
  <p className="text-xl font-bold text-foreground">{bundle.sense.meaningVi}</p>
  {bundle.sense.noteVi && <p className="rounded-control bg-warning/10 p-3 text-foreground-secondary">{bundle.sense.noteVi}</p>}
  {bundle.sense.synonyms.length > 0 && <p className="text-sm text-muted">Gần nghĩa: {bundle.sense.synonyms.join(', ')}</p>}
  {example ? <div className="space-y-1 text-sm"><p className="font-bold">{parts ? <>{parts.before}<strong className="text-accent">{parts.answer}</strong>{parts.after}</> : example.english}</p><p className="text-muted">{example.meaningVi}</p><audio controls preload="none" src={`/api/audio?exampleId=${encodeURIComponent(example.id)}`} /></div> : <p className="text-sm text-muted">Chưa có ví dụ.</p>}
  <WordFamily family={bundle.sense.family} />
  <AdvancedNotes notes={bundle.sense.advanced} />
 </div>;
}
