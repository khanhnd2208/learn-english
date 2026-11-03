import Link from 'next/link';
import type { MyTestPaper } from '@/services/english/enTestService';

export default function TestPaperList({ papers, hasCourses }: { papers: MyTestPaper[]; hasCourses: boolean }) {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
    <h1 className="text-3xl">Bài kiểm tra</h1>
    {papers.length ? <ul className="space-y-2">{papers.map((paper) => <li key={paper.id} className="word-row">
      <div className="min-w-0 flex-1"><p className="truncate font-bold">{paper.title}</p><p className="truncate text-xs text-muted">{paper.subjectTitle} · {paper.questionCount} câu</p></div>
      {paper.best && <span className={`shrink-0 text-xs font-bold ${paper.best.passed ? 'text-success' : 'text-muted'}`}>{paper.best.passed ? 'Đạt' : 'Chưa đạt'} · {Math.round(paper.best.score * 100 / paper.best.total)}%</span>}
      <Link href={`/tests/papers/${paper.id}`} className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-control bg-accent px-3 text-xs font-bold text-accent-foreground">{paper.best ? 'Làm lại' : 'Làm bài'}</Link>
    </li>)}</ul> : hasCourses ? <p className="text-sm text-muted">Các khóa của bạn chưa có đề.</p>
      : <div className="space-y-2"><p className="text-sm text-muted">Bạn chưa tham gia khóa học nào.</p><Link href="/tests" className="inline-flex min-h-11 items-center font-bold text-accent">Xem khóa học</Link></div>}
  </div>;
}
