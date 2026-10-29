'use client';
import { useAdvancedMode } from '@/components/english/advanced/useAdvancedMode';
import { ADVANCED_KIND_LABEL, type AdvancedNote } from '@/lib/english/advancedNotes';

/** Fixed phrases for this sense. Nothing is shown until the learner turns on "Nâng cao" on the Ôn tập page. */
export default function AdvancedNotes({ notes }: { notes: AdvancedNote[] }) {
 const on = useAdvancedMode();
 if (!on || notes.length === 0) return null;
 return <section aria-label="Cụm từ nâng cao" className="rounded-panel border border-accent/20 bg-accent/5 px-4 py-3">
  <p className="text-xs font-bold uppercase tracking-wide text-accent">Nâng cao · cụm từ hay đi kèm</p>
  <ul className="mt-1 divide-y divide-accent/10">{notes.map((note) => <li key={`${note.kind}:${note.phrase}`} className="py-2 text-sm">
   <p className="flex flex-wrap items-baseline gap-x-2"><span className="font-bold text-foreground">{note.phrase}</span><span className="text-xs text-muted">{ADVANCED_KIND_LABEL[note.kind]}</span></p>
   {note.meaningVi && <p className="text-foreground-secondary">{note.meaningVi}</p>}
   {note.example && <p className="mt-0.5 italic text-muted">{note.example}</p>}
  </li>)}</ul>
 </section>;
}
