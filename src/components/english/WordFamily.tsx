import type { FamilyMember } from '@/lib/english/wordFamily';

/** Same-root words, one short line each; always visible, unlike "Nâng cao". */
export default function WordFamily({ family }: { family: FamilyMember[] }) {
 if (family.length === 0) return null;
 return <section aria-label="Họ từ" className="rounded-panel border border-border/70 px-4 py-3">
  <p className="text-xs font-bold uppercase tracking-wide text-muted">Họ từ</p>
  <ul className="mt-1 divide-y divide-border/60">{family.map((member) => <li key={member.word} className="flex flex-wrap items-baseline gap-x-2 py-1.5 text-sm">
   <span className="font-bold text-foreground">{member.word}</span>
   {member.partOfSpeech && <span className="text-xs text-muted">({member.partOfSpeech})</span>}
   {member.meaningVi && <span className="text-foreground-secondary">{member.meaningVi}</span>}
  </li>)}</ul>
 </section>;
}
