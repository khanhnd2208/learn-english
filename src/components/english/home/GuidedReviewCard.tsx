import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';

export default function GuidedReviewCard() {
  return <Link href="/review" aria-label="Ôn theo bộ" className="word-row min-h-14 text-foreground hover:border-accent focus-visible:ring-2 focus-visible:ring-accent">
    <MaterialIcon name="style" className="text-accent" />
    <span className="min-w-0 flex-1 truncate font-bold">Ôn theo bộ</span>
    <MaterialIcon name="chevron_right" className="text-muted" />
  </Link>;
}
