import type { ReactNode } from 'react';
import Link from 'next/link';
import MaterialIcon from './MaterialIcon';

interface Props {
  href?: string;
  title: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  progress?: { value: number; max: number };
}

export default function ListRow({ href, title, meta, leading, trailing, progress }: Props) {
  const content = <>
    {leading && <span className="shrink-0">{leading}</span>}
    <span className="min-w-0 flex-1">
      <span className="block truncate font-bold">{title}</span>
      {meta && <span className="block truncate text-xs text-muted">{meta}</span>}
      {progress && progress.max > 0 && <span role="progressbar" aria-label="Tiến độ" aria-valuemin={0} aria-valuemax={progress.max} aria-valuenow={progress.value} className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-container"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, progress.value * 100 / progress.max))}%` }} /></span>}
    </span>
    {trailing && <span className="shrink-0">{trailing}</span>}
    {href && <MaterialIcon name="chevron_right" className="shrink-0 text-muted" />}
  </>;
  return <li className="word-row">{href ? <Link href={href} className="word-row-link">{content}</Link> : content}</li>;
}
