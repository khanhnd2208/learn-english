'use client';
import type { SenseBundle } from '@/lib/english/senseBundle';
import { WordDetails, WordHeader } from '@/components/english/WordCardParts';

/** Study card: one example only — the other sentences are kept hidden for questions. */
export default function EnglishWordCard({ bundle }: { bundle: SenseBundle }) {
 return <div className="space-y-5">
  <WordHeader bundle={bundle} />
  <WordDetails bundle={bundle} />
 </div>;
}
