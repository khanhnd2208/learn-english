import type { FamilyMember } from '@/lib/english/wordFamily';

/** Same-root words with their part of speech and meaning; always visible, unlike "Nâng cao". */
export default function WordFamily({ family }: { family: FamilyMember[] }) {
 if (family.length === 0) return null;
 return <section aria-label="Họ từ" className="space-y-2">
  <p className="text-xs font-bold uppercase tracking-wide text-muted">Họ từ</p>
  <ul className="grid gap-2 sm:grid-cols-2">{family.map((member) => <li key={member.word} className="rounded-panel border border-border bg-surface-secondary px-3 py-2 text-sm">
   <p className="flex flex-wrap items-baseline gap-x-2"><span className="font-bold text-foreground">{member.word}</span>{member.partOfSpeech && <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-bold text-muted">{member.partOfSpeech}</span>}</p>
   {member.meaningVi && <p className="text-foreground-secondary">{member.meaningVi}</p>}
  </li>)}</ul>
 </section>;
}
