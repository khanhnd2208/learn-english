import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import type { listMyTestResults } from '@/services/english/enTestService';

export default function TestResults({ rows }: { rows: Awaited<ReturnType<typeof listMyTestResults>> }) {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <header><h1 className="text-3xl">Kết quả</h1><p className="mt-1 text-sm text-muted">Các lần nộp bài gần đây của bạn.</p></header>
    {!rows.length ? <div className="space-y-3"><EmptyState icon="flag" title="Chưa có kết quả" description="Làm một bài kiểm tra để xem kết quả ở đây." /><Link href="/tests" className="inline-flex min-h-11 items-center font-bold text-accent">Chọn môn học →</Link></div>
      : <ul className="space-y-2">{rows.map((row) => <li key={row.attemptId} className="word-row"><Link href={`/tests/results/${row.attemptId}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="min-w-0 flex-1"><span className="block truncate font-bold">{row.paperTitle}</span><span className="block truncate text-xs text-muted">{row.subjectTitle} · {row.day}</span></span><span className="shrink-0 text-sm font-bold tabular-nums">{row.score}/{row.total} · {row.percent}%</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${row.passed ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>{row.passed ? 'Đạt' : 'Chưa đạt'}</span></Link></li>)}</ul>}
  </div>;
}
