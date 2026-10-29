'use client';
import { setAdvancedMode, useAdvancedMode } from '@/components/english/advanced/useAdvancedMode';

/** Switch for B2–C2 reading: collocations, prepositions and patterns on each word card. */
export default function AdvancedToggle({ className = '' }: { className?: string }) {
 const on = useAdvancedMode();
 return <label title="Hiện cụm từ hay đi kèm (giới từ, mẫu câu, thành ngữ) trên thẻ từ" className={`inline-flex cursor-pointer select-none items-center gap-2 text-sm font-bold text-foreground-secondary ${className}`}>
  <input type="checkbox" role="switch" className="peer sr-only" checked={on} onChange={(event) => setAdvancedMode(event.target.checked)} />
  <span aria-hidden className={`relative h-5 w-9 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${on ? 'bg-accent' : 'bg-border'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} /></span>
  Nâng cao
 </label>;
}
