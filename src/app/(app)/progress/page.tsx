import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getGoalBoard } from '@/services/english/enGoalService';
import { getTodayOverview } from '@/services/english/enDailyService';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { getProgressHistory } from '@/services/english/enProgressService';
import WeekStrip from '@/components/english/goals/WeekStrip';
import StageBar from '@/components/english/StageBar';
import DueForecast from '@/components/english/DueForecast';
import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';

export const dynamic = 'force-dynamic';
export default async function ProgressPage() {
 const session = await auth();
 if (!session?.user) redirect('/login');
 const [board, overview, sets, history] = await Promise.all([getGoalBoard(session.user.id), getTodayOverview(session.user.id), listEnglishSets(session.user.id, false), getProgressHistory(session.user.id)]);
 const stages = sets.filter((set) => set.enrolled).reduce((sum, set) => ({ new: sum.new + set.stages.new, learning: sum.learning + set.stages.learning, remembering: sum.remembering + set.stages.remembering, longTerm: sum.longTerm + set.stages.longTerm }), { new: 0, learning: 0, remembering: 0, longTerm: 0 });
 const max = Math.max(1, ...history.weeks.map((week) => week.longTerm));
 const current = history.weeks.at(-1)!; const previous = history.weeks.at(-2)!;
 const delta = current.longTerm - previous.longTerm;
 return <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
  <header><h1 className="text-3xl">Tiến bộ</h1><p className="mt-1 text-sm text-muted">Nhìn lại những ngày bạn đã học.</p></header>
  <div className="grid gap-4 md:grid-cols-2">
   <section className="mode-card"><div className="flex items-center justify-between"><h2 className="text-xl">Tuần này</h2><span className="font-bold">{board.streak.current} ngày liên tiếp</span></div><div className="mt-4"><WeekStrip days={board.week.days} /></div></section>
   <section className="mode-card"><h2 className="text-xl">Từ nhớ lâu <InfoHint title={HINTS.stages.title}>{HINTS.stages.body}</InfoHint></h2><p className="mt-2"><span className="game-number text-4xl">{current.longTerm}</span> <span className="text-sm text-muted">{delta > 0 ? '+' : ''}{delta} so với đầu tuần</span></p><ol className="mt-4 flex h-24 items-end gap-2" aria-label="Số từ nhớ lâu trong 8 tuần">{history.weeks.map((week) => <li key={week.start} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1 text-xs" aria-label={`Tuần ${week.start}: ${week.longTerm} từ`}><span className="w-full rounded-t bg-accent/70" style={{height: `${Math.max(3, week.longTerm / max * 70)}px`}} /><span>{`${week.start.slice(8, 10)}/${week.start.slice(5, 7)}`}</span></li>)}</ol><p className="mt-2 text-xs text-muted">Ước tính từ lịch sử ôn đã ghi nhận; những dữ liệu cũ thiếu lịch sử có thể ảnh hưởng biểu đồ.</p></section>
   <section className="mode-card"><h2 className="text-xl">Mức nhớ</h2><div className="mt-4"><StageBar stages={stages} /></div><h3 className="mt-5 font-bold">7 ngày tới</h3><div className="mt-3"><DueForecast days={overview.dueNext7Days} height="h-20" /></div></section>
   <section className="mode-card"><h2 className="text-xl">Độ chính xác tuần này</h2><p className="mt-3 text-2xl font-bold">{current.answers ? `${Math.round(current.correct / current.answers * 100)}%` : "Chưa có lượt ôn"}</p><p className="text-sm text-muted">{current.correct}/{current.answers} câu đúng trong lịch ôn</p><details className="mt-2 text-sm"><summary className="cursor-pointer font-bold text-accent">Xem 8 tuần</summary><ul className="mt-2 space-y-1">{history.weeks.map((week) => <li key={week.start} className="flex justify-between"><span>Tuần {week.start.slice(8, 10)}/{week.start.slice(5, 7)}</span><span>{week.answers ? `${Math.round(week.correct / week.answers * 100)}% (${week.correct}/${week.answers})` : "Chưa ôn"}</span></li>)}</ul></details><h2 className="mt-5 text-xl">Từ hay sai</h2>{history.wrong.length ? <ul className="mt-3 divide-y divide-border">{history.wrong.map((word) => <li key={word.id} className="flex justify-between gap-3 py-2"><span><strong>{word.lemma}</strong> · {word.meaning}</span><span className="shrink-0 text-sm text-muted">{word.count} lần sai</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa có từ sai trong 8 tuần qua.</p>}<Link href="/review" className="mt-3 inline-flex min-h-11 items-center font-bold text-accent">Ôn theo bộ →</Link></section>
   <section className="mode-card md:col-span-2"><h2 className="text-xl">Nhiệm vụ và thành tựu</h2><p className="mt-2">Cấp {board.level.level} · {board.level.title} · {board.achievements.filter((achievement) => achievement.reached > 0).length}/{board.achievements.length} thành tựu</p><div className="mt-3 flex flex-wrap gap-4"><Link href="/quests?tab=week" className="inline-flex min-h-11 items-center font-bold text-accent">Nhiệm vụ tuần và rương →</Link><Link href="/quests?tab=achievements" className="inline-flex min-h-11 items-center font-bold text-accent">Xem thành tựu →</Link></div></section>
  </div>
 </div>;
}
