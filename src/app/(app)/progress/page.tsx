import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { auth } from '@/lib/auth';
import { getEnglishProgress } from '@/services/english/enProgressService';

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
	const hasStudy = progress.masteredSeries.some((point) => point.mastered > 0)
		|| progress.studySecondsByWeek.some((week) => week.seconds > 0);
	if (!hasStudy) {
		return (
			<div className="mx-auto max-w-xl px-4 py-16">
				<EmptyState icon="trending_up" title="Chưa có tiến bộ" description="Luyện và kiểm tra một bộ từ để thấy số từ đã nắm." action={{ label: 'Bộ từ', href: '/' }} />
			</div>
		);
	}
	const peak = Math.max(1, ...progress.masteredSeries.map((point) => point.mastered));
	const firstPoint = progress.masteredSeries[0];
	const lastPoint = progress.masteredSeries.at(-1);
	return (
		<div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
			<h1 className="text-3xl font-black text-foreground">Tiến bộ</h1>
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
