import { EmptyState, ListRow, PageHeader } from '@/components/ui';
import type { listMyTestResults } from '@/services/english/enTestService';
import TestScoreTrail from './TestScoreTrail';

export default function TestResults({ rows }: { rows: Awaited<ReturnType<typeof listMyTestResults>> }) {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <PageHeader title="Kết quả" />
    {!rows.length ? <EmptyState icon="flag" title="Chưa có kết quả" action={{ label: 'Chọn khóa học', href: '/tests' }} />
      : <ul className="space-y-2">{rows.map((row) => <ListRow key={row.attemptId} href={`/tests/results/${row.attemptId}`} title={row.paperTitle} meta={`${row.subjectTitle} · ${row.score}/${row.total} · ${row.day}`} trailing={<TestScoreTrail percent={row.percent} passed={row.passed} />} />)}</ul>}
  </div>;
}
