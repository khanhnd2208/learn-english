import { ListRow } from '@/components/ui';
import { EN_TEST_HISTORY_LIMIT } from '@/lib/english/constants';
import type { getTestPaperForLearner } from '@/services/english/enTestService';
import TestScoreTrail from './TestScoreTrail';

type Rows = Awaited<ReturnType<typeof getTestPaperForLearner>>['history'];

export default function TestAttemptHistory({ rows, total, currentAttemptId }: { rows: Rows; total: number; currentAttemptId?: string }) {
  if (!rows.length) return null;
  return <details className="space-y-2">
    <summary className="min-h-11 cursor-pointer text-lg font-bold">Lịch sử làm bài ({total})</summary>
    <ul className="space-y-2">{rows.map((row) => <ListRow key={row.attemptId} href={`/tests/results/${row.attemptId}`} title={row.attemptId === currentAttemptId ? `Lần ${row.number} · Vừa nộp` : `Lần ${row.number}`} meta={`${row.score}/${row.total} · ${row.finishedAt}`} trailing={<TestScoreTrail percent={row.percent} passed={row.passed} />} />)}</ul>
    {total > EN_TEST_HISTORY_LIMIT && <p className="text-xs text-muted">Hiển thị {EN_TEST_HISTORY_LIMIT} lần gần nhất.</p>}
  </details>;
}
