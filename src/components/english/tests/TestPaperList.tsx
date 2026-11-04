import { EmptyState, ListRow, PageHeader } from '@/components/ui';
import type { MyTestPaper } from '@/services/english/enTestService';
import TestScoreTrail from './TestScoreTrail';

export default function TestPaperList({ papers, hasCourses }: { papers: MyTestPaper[]; hasCourses: boolean }) {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <PageHeader title="Bài kiểm tra" />
    {papers.length ? <ul className="space-y-2">{papers.map((paper) => <ListRow key={paper.id} href={`/tests/papers/${paper.id}`} title={paper.title} meta={`${paper.subjectTitle} · ${paper.questionCount} câu`} trailing={paper.best ? <TestScoreTrail percent={Math.round(paper.best.score * 100 / paper.best.total)} passed={paper.best.passed} /> : undefined} />)}</ul>
      : <EmptyState icon="quiz" title="Chưa có đề" action={{ label: hasCourses ? 'Xem khóa học' : 'Chọn khóa học', href: '/tests' }} />}
  </div>;
}
