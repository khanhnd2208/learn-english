'use client';
import { exampleParts, type SenseBundle } from '@/lib/english/senseBundle';
import EnglishAudioButton from '@/components/english/EnglishAudioButton';
import AdvancedNotes from '@/components/english/advanced/AdvancedNotes';

export default function EnglishWordCard({ bundle }: { bundle: SenseBundle }) {
 return <div className="space-y-4">
  <div><p className="text-3xl font-black text-foreground">{bundle.word.lemma}</p><p className="text-sm text-muted">{bundle.word.ipa} · ({bundle.sense.partOfSpeech})</p></div>
  <EnglishAudioButton senseId={bundle.sense.id} lemma={bundle.word.lemma} recordedAudioAvailable={Boolean(bundle.word.audioPath.trim())} />
  <p className="text-xl font-bold text-foreground">{bundle.sense.meaningVi}</p>
  {bundle.sense.noteVi && <p className="rounded-control bg-warning/10 p-3 text-foreground-secondary">{bundle.sense.noteVi}</p>}
  {bundle.sense.synonyms.length > 0 && <p className="text-sm text-muted">Gần nghĩa: {bundle.sense.synonyms.join(', ')}</p>}
  <AdvancedNotes notes={bundle.sense.advanced} />
  <ul className="space-y-3 text-sm">{bundle.examples.map((example) => <li key={example.id}><p className="font-bold">{exampleParts(example) ? <>{exampleParts(example)!.before}<strong>{exampleParts(example)!.answer}</strong>{exampleParts(example)!.after}</> : example.english}</p><p className="text-muted">{example.meaningVi}</p><audio controls preload="none" src={`/api/audio?exampleId=${encodeURIComponent(example.id)}`} /></li>)}{bundle.examples.length === 0 && <li className="text-muted">Chưa có ví dụ.</li>}</ul>
 </div>;
}
