'use client';
import AdvancedToggle from '@/components/english/advanced/AdvancedToggle';
import { useAdvancedMode } from '@/components/english/advanced/useAdvancedMode';
import { ADVANCED_KIND_LABEL, type AdvancedNote } from '@/lib/english/advancedNotes';

/** Fixed phrases for this sense; hidden until the learner turns on "Nâng cao". */
export default function AdvancedNotes({ notes }: { notes: AdvancedNote[] }) {
 const on = useAdvancedMode();
 if (notes.length === 0) return null;
 return <section aria-label="Cụm từ nâng cao" className="space-y-2">
  <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-muted">Cụm từ hay đi kèm{!on && ` · ${notes.length}`}</p><AdvancedToggle /></div>
  {!on && <p className="text-xs text-muted">Giới từ, mẫu câu và kết hợp từ cố định của nghĩa này. Bật Nâng cao để xem.</p>}
  {on && <ul className="space-y-2">{notes.map((note) => <li key={`${note.kind}:${note.phrase}`} className="rounded-panel border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
   <p className="flex flex-wrap items-baseline gap-x-2"><span className="font-bold text-foreground">{note.phrase}</span><span className="text-xs text-muted">{ADVANCED_KIND_LABEL[note.kind]}</span></p>
   {note.meaningVi && <p className="text-foreground-secondary">{note.meaningVi}</p>}
   {note.example && <p className="mt-1 italic text-muted">{note.example}</p>}
  </li>)}</ul>}
 </section>;
}
