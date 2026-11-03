import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { EN_TEST_HISTORY_LIMIT } from '@/lib/english/constants';
import type { getTestPaperForLearner } from '@/services/english/enTestService';

type Rows = Awaited<ReturnType<typeof getTestPaperForLearner>>['history'];

export default function TestAttemptHistory({ rows, total, currentAttemptId }: { rows: Rows; total: number; currentAttemptId?: string }) {
  if (!rows.length) return null;
  return <section className="space-y-2">
    <h2 className="text-lg font-bold">Lịch sử làm bài</h2>
    <ul className="space-y-2">{rows.map((row) => <li key={row.attemptId} className="word-row"><Link href={`/tests/results/${row.attemptId}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="min-w-0 flex-1"><span className="block truncate font-bold">{row.attemptId === currentAttemptId ? `Lần ${row.number} · Vừa nộp` : `Lần ${row.number}`}</span><span className="block truncate text-xs text-muted">{row.finishedAt}</span></span><span className="shrink-0 text-sm font-bold tabular-nums">{row.score}/{row.total} · {row.percent}%</span><Badge variant={row.passed ? 'success' : 'error'} className="shrink-0">{row.passed ? 'Đạt' : 'Chưa đạt'}</Badge></Link></li>)}</ul>
    {total > EN_TEST_HISTORY_LIMIT && <p className="text-xs text-muted">Hiển thị {EN_TEST_HISTORY_LIMIT} lần gần nhất.</p>}
  </section>;
}
