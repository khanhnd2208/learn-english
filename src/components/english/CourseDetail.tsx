'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import CourseEnrollButton from '@/components/english/CourseEnrollButton';
import type { CourseDetail as CourseDetailData } from '@/services/english/enCourseService';

export default function CourseDetail({ detail, isAdmin, initialTab }: { detail: CourseDetailData; isAdmin: boolean; initialTab: 'words' | 'exams' }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const examGroups = detail.exams.reduce<Array<{ key: string; title: string; rows: CourseDetailData['exams'] }>>((groups, exam) => {
    const key = exam.setId ?? 'summary';
    let group = groups.find((row) => row.key === key);
    if (!group) { group = { key, title: exam.setId ? `Bài ${exam.lessonNumber} · ${exam.lessonTitle}` : 'Ôn tổng hợp', rows: [] }; groups.push(group); }
    group.rows.push(exam);
    return groups;
  }, []);
  function changeTab(next: string) { setTab(next as 'words' | 'exams'); router.replace(next === 'exams' ? '?tab=kiem-tra' : '?', { scroll: false }); }
  async function leave() {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/courses/${detail.id}/enroll`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không rời được khóa học');
      router.push('/store'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không rời được khóa học'); }
    finally { setPending(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-10">
    <Link href="/store" className="inline-flex min-h-10 items-center text-sm font-bold text-accent">← Khóa học</Link>
    <header className="mode-card space-y-3.5 sm:space-y-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl sm:text-4xl">{detail.title}</h1><p className="mt-1 text-sm text-muted">{detail.lessons.length ? `${detail.learned}/${detail.words} từ đã học${detail.longTerm > 0 ? ` · ${detail.longTerm} nhớ lâu` : ''}` : 'Khóa chưa có bài nào.'}</p>{detail.description && <p className="mt-1.5 text-sm text-muted">{detail.description}</p>}</div>{detail.enrolled && <details className="relative shrink-0"><summary aria-label="Tùy chọn khóa học" className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-control border border-border text-xl">⋯</summary><div className="absolute right-0 z-20 mt-1 rounded-card border border-border bg-surface p-2 shadow-overlay"><Button type="button" variant="ghost" onClick={() => setConfirmLeave(true)}>Rời khóa học</Button></div></details>}</div>
      {detail.words > 0 && <ProgressBar value={detail.learned} max={detail.words} className="h-2" />}
      {!detail.enrolled && detail.status === 'published' && <CourseEnrollButton courseId={detail.id} locked={detail.locked} />}
    </header>
    <Tabs value={tab} onValueChange={changeTab}><TabsList><TabsTrigger value="words">Từ vựng</TabsTrigger><TabsTrigger value="exams">Kiểm tra</TabsTrigger></TabsList>
      <TabsContent value="words">{detail.lessons.length ? <ul className="space-y-2">{detail.lessons.map((lesson) => <li key={lesson.setId} className="word-row"><Link href={`/sets/${lesson.setId}`} className="min-w-0 flex-1"><span className="block truncate font-bold">Bài {lesson.number} · {lesson.title}</span><span className="text-xs text-muted">{lesson.words} từ{lesson.learned > 0 ? ` · ${lesson.learned} đã học` : ''}{isAdmin && lesson.status === 'draft' ? ' · Bản nháp' : ''}</span><ProgressBar value={lesson.learned} max={lesson.words || 1} className="mt-2 h-1" /></Link></li>)}</ul> : <p className="text-sm text-muted">Khóa này chưa có bài nào.</p>}</TabsContent>
      <TabsContent value="exams" className="space-y-4">
        {!detail.enrolled && !isAdmin && <p className="text-sm text-muted">Đăng ký khóa học để làm bài kiểm tra.</p>}
        {examGroups.length ? examGroups.map((group) => <section key={group.key} className="space-y-2"><h2 className="font-bold">{group.title}</h2><ul className="space-y-2">{group.rows.map((exam) => <li key={exam.id} className="word-row"><div className="min-w-0 flex-1"><p className="truncate font-bold">{exam.title}</p><p className="text-xs text-muted">{exam.questionCount} câu{isAdmin && exam.status === 'draft' ? ' · Bản nháp' : ''}</p></div>{exam.inProgress ? <span className="shrink-0 text-xs font-bold text-accent">Đang làm</span> : exam.best ? <span className="shrink-0 text-xs font-bold text-muted">{exam.best.passed ? `Đạt · ${exam.best.score}/${exam.best.total}` : `Cao nhất ${exam.best.score}/${exam.best.total}`}</span> : null}{detail.enrolled || isAdmin ? <Link href={`/courses/${detail.id}/exams/${exam.id}`} className="inline-flex min-h-10 shrink-0 items-center rounded-control bg-accent px-3 text-xs font-bold text-accent-foreground">{exam.inProgress ? 'Làm tiếp' : exam.best ? 'Làm lại' : 'Làm bài'}</Link> : <span className="inline-flex min-h-10 shrink-0 items-center rounded-control bg-surface-container px-3 text-xs font-bold text-muted">Làm bài</span>}</li>)}</ul></section>) : <p className="text-sm text-muted">Khóa này chưa có bài kiểm tra.</p>}
      </TabsContent>
    </Tabs>
    <Dialog open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Rời khóa học?" description="Các bài của khóa sẽ rời khỏi lịch ôn. Tiến độ từ đã học vẫn được giữ nếu bạn đăng ký lại."><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmLeave(false)}>Ở lại</Button><Button type="button" loading={pending} onClick={() => void leave()}>Rời khóa</Button></div>{error && <p className="mt-2 text-sm text-error">{error}</p>}</Dialog>
  </div>;
}
