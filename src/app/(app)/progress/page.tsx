import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { auth } from '@/lib/auth';
import { getEnglishProgress } from '@/services/english/enProgressService';
import { levelFromXp, xpIntoLevel, xpToNextLevel, titleFromMastered } from '@/lib/english/gamify/level';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import LearnerProfileForm from '@/components/english/LearnerProfileForm';
import { AdventureIcon } from '@/components/english/AdventureIcon';
import LearnerRewardForm from '@/components/english/LearnerRewardForm';

export const dynamic = 'force-dynamic';

function minutes(seconds: number): string {
	if (seconds < 60) return `${seconds} giây`;
	return `${Math.round(seconds / 60)} phút`;
}

function shortDate(day: string): string {
	const [, month, date] = day.split('-');
	return `${date}/${month}`;
}

function weekLabel(day: string): string {
	return `Tuần ${shortDate(day)}`;
}

export default async function EnglishProgressPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const progress = await getEnglishProgress(session.user.id);
	const level = levelFromXp(progress.totalXp);
	const toward = Math.min(100, xpIntoLevel(progress.totalXp));
	const peak = Math.max(1, ...progress.masteredSeries.map((point) => point.mastered));
	const firstPoint = progress.masteredSeries[0];
	const lastPoint = progress.masteredSeries.at(-1);
	return (
		<div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
			<h1 className="text-3xl font-black text-foreground">Nhân vật</h1>
			<Card className="game-hero"><CardContent className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="label-caps">Cấp độ {level} · {titleFromMastered(progress.masteredNow)}</p><p className="mt-2 text-3xl font-black">{progress.totalXp} XP ghi nhớ</p><div className="game-progress-track mt-3 h-3 w-full"><div className="game-progress-fill" style={{ width: `${toward}%` }} /></div><p className="mt-2 text-xs text-muted">{xpToNextLevel(progress.totalXp)} XP đến cấp {level + 1}. Level phản ánh trí nhớ đã chứng minh; danh hiệu phản ánh vốn từ đang giữ.</p></div><div className="text-center"><div className="game-avatar mx-auto"><AdventureIcon name="compass" size={30} /></div><p className="mt-2 text-sm font-black">{progress.masteredNow} từ</p></div></CardContent></Card>
			<Card>
				<CardContent className="space-y-3">
					<p className="label-caps">Số từ đã nắm</p>
					<p className="text-4xl font-black">{progress.masteredNow}</p>
					<div className="flex h-24 items-end gap-px" aria-hidden="true">
						{progress.masteredSeries.filter((_, index) => index % 3 === 0).map((point) => (
							<div key={point.day} className="flex-1 rounded-sm bg-accent" style={{ height: `${Math.max(4, (point.mastered / peak) * 100)}%` }} title={`${point.day}: ${point.mastered}`} />
						))}
					</div>
					<div className="flex justify-between text-xs text-muted"><span>{firstPoint ? shortDate(firstPoint.day) : '—'}</span><span>Hiện tại · {lastPoint?.mastered ?? 0} từ</span><span>{lastPoint ? shortDate(lastPoint.day) : '—'}</span></div>
					<p className="text-xs text-muted">Đường tăng khi bạn đạt cả hai câu sau khoảng cách tối thiểu; giảm khi một từ đã nắm không còn đạt.</p>
				</CardContent>
			</Card>
			<div className="grid gap-3 sm:grid-cols-2"><Card className="game-card game-card-lilac"><CardContent><p className="label-caps">Huy hiệu · Giữ vững</p><p className="mt-2 flex items-center gap-2 text-2xl font-black"><AdventureIcon name="shield" size={24} framed />{progress.heldCount} từ</p><p className="text-xs text-muted">Từ đạt lại sau ít nhất 7 ngày.</p></CardContent></Card><Card className="game-card game-card-amber"><CardContent><p className="label-caps">Huy hiệu · Từ đã cứu</p><p className="mt-2 flex items-center gap-2 text-2xl font-black"><AdventureIcon name="spark" size={24} framed />{progress.rescuedCount} từ</p><p className="text-xs text-muted">Không cộng XP; ghi nhận việc quay lại từ khó.</p></CardContent></Card></div>
			<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Hiểu nghĩa', progress.stats.meaning, 'Đúng meaning_choice và cloze_choice trong 90 ngày.'], ['Nghe', progress.stats.listening, 'Đúng listen_choice và listen_type trong 90 ngày.'], ['Viết', progress.stats.writing, 'Đúng recall_type trong 90 ngày.']].map(([label, items, source]) => { const data = items as Array<{ correct: boolean | null }>; const valid = data.filter((item) => item.correct !== null); const pct = valid.length >= 20 ? Math.round(valid.filter((item) => item.correct).length / valid.length * 100) : null; return <Card key={label as string}><CardContent><p className="label-caps">{label as string} <span title={source as string} aria-label={source as string}>ⓘ</span></p><p className="mt-2 text-2xl font-black">{pct === null ? 'Chưa đủ dữ liệu' : `${pct}%`}</p><p className="text-xs text-muted">{valid.length} câu · tối thiểu 20 · 90 ngày</p></CardContent></Card>; })}<Card><CardContent><p className="label-caps">Trí nhớ <span title="Tỷ lệ kết quả counted đạt tiếp ở lần kiểm tra counted kế tiếp." aria-label="Tỷ lệ giữ được giữa các lần kiểm tra hợp lệ">ⓘ</span></p><p className="mt-2 text-2xl font-black">{progress.retention.pairs < 20 ? 'Chưa đủ dữ liệu' : `${Math.round((progress.retention.rate ?? 0) * 100)}%`}</p><p className="text-xs text-muted">{progress.retention.pairs} cặp kiểm tra · tối thiểu 20.</p></CardContent></Card><Card><CardContent><p className="label-caps">Phản xạ · Tự nhớ <span title="Trung vị responseMs của câu recall_type đúng theo tuần." aria-label="Được đo từ thời gian trả lời câu recall_type đúng">ⓘ</span></p><p className="mt-2 text-2xl font-black">{progress.recallMedianByWeek.at(-1)?.medianMs == null ? 'Chưa đủ dữ liệu' : `${Math.round((progress.recallMedianByWeek.at(-1)?.medianMs ?? 0) / 100) / 10} giây`}</p><p className="text-xs text-muted">Trung vị tuần gần nhất.</p></CardContent></Card><Card><CardContent><p className="label-caps">Nhịp học <span title="Ngày có bài kiểm tra đã nộp hoặc phiên luyện ≥ 5 phút với senseIds thuộc phiên." aria-label="Ngày học tính từ bài kiểm tra nộp hoặc phiên luyện hợp lệ đủ 5 phút">ⓘ</span></p><p className="mt-2 text-2xl font-black">{progress.studyDays.length}/{progress.weeklyDaysGoal} ngày</p><p className="text-xs text-muted">Mục tiêu tự đặt tuần này; nghỉ không làm mất gì.</p></CardContent></Card></section>
			<LearnerProfileForm />
			<LearnerRewardForm unlockLevel={level + 1} />
			<div className="flex gap-2"><Link href="/quests"><Button variant="secondary">Nhiệm vụ</Button></Link><Link href="/"><Button variant="secondary">Về Hôm nay</Button></Link></div>
			<Card>
				<CardContent>
					<p className="label-caps">Tỷ lệ giữ</p>
					<p className="mt-2 text-3xl font-black">{progress.retention.rate == null ? '—' : `${Math.round(progress.retention.rate * 100)}%`}</p>
					<p className="text-sm text-muted">{progress.retention.held}/{progress.retention.pairs} lần đạt vẫn đạt ở lần tính kế tiếp.</p>
					<p className="mt-2 text-xs text-muted">Tỷ lệ này cho biết kiến thức có được giữ qua các lần kiểm tra hợp lệ hay không.</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="space-y-2">
					<p className="label-caps">Thời gian trả lời câu tự nhớ</p>
					<ul className="space-y-1 text-sm">
						{progress.recallMedianByWeek.map((week) => (
							<li key={week.week} className="flex justify-between">
								<span>{weekLabel(week.week)}</span>
								<span>{week.medianMs == null ? '—' : `${Math.round(week.medianMs / 100) / 10} giây`}</span>
							</li>
						))}
					</ul>
					<p className="text-xs text-muted">Thời gian trung vị thấp dần cho thấy bạn gọi lại từ nhanh hơn.</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="space-y-2">
					<p className="label-caps">Thời gian học</p>
					<ul className="space-y-1 text-sm">
						{progress.studySecondsByWeek.map((week) => (
							<li key={week.week} className="flex justify-between">
								<span>{weekLabel(week.week)}</span>
								<span>{minutes(week.seconds)}</span>
							</li>
						))}
					</ul>
					<p className="text-xs text-muted">Chỉ tính thời gian bạn thực sự tương tác trong phiên luyện và thời gian làm bài kiểm tra.</p>
				</CardContent>
			</Card>
		</div>
	);
}
