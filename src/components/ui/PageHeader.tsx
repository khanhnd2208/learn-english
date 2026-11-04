import type { ReactNode } from 'react';

export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <header className="flex min-h-11 items-center justify-between gap-3">
    <h1 className="min-w-0 text-2xl sm:text-3xl">{title}</h1>
    {action}
  </header>;
}
