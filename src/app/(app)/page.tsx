import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Button from '@/components/ui/Button';
import EnrollButton from '@/components/english/EnrollButton';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';
import { countReviewEligible } from '@/services/english/enPracticeService';
import { getEnglishProgress } from '@/services/english/enProgressService';
import DailySummary from '@/components/english/DailySummary';
import { AdventureIcon, AdventureLandscape } from '@/components/english/AdventureIcon';

export const dynamic = 'force-dynamic';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function localDayKey(date: Date) {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function weekKeys(now: Date) {
	const today = localDayKey(now);
	const [year, month, day] = today.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	const weekday = (date.getUTCDay() + 6) % 7;
	date.setUTCDate(date.getUTCDate() - weekday);
	return weekDays.map((_, index) => {
		const item = new Date(date);
		item.setUTCDate(date.getUTCDate() + index);
		return item.toISOString().slice(0, 10);
	});
}

export default async function EnglishHomePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const [sets, reviewEligible, progress] = await Promise.all([
		listEnglishSets(session.user.id, session.user.role === 'admin'),
		countReviewEligible(session.user.id),
		getEnglishProgress(session.user.id),
	]);
	if (sets.length === 0) {
		return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState icon="library_books" title="Chưa có bộ từ" description="Admin cần nhập và xuất bản nội dung trước." /></div>;
	}
	const learning = sets.filter((set) => set.enrolled);
	const others = sets.filter((set) => !set.enrolled);
	const mistakeCount = sets.reduce((total, set) => total + set.inMistakeBook, 0);
	const today = localDayKey(new Date());
	const days = weekKeys(new Date());
	const studiedDays = new Set(progress.studyDays);
	const mastered = progress.masteredNow;
	const title = progress.title;
	const renderSet = (set: (typeof sets)[number]) => (
		<li key={set.id}>
			<Card interactive className="relative">
				<Link href={`/sets/${set.id}`} className="absolute inset-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Mở bộ ${set.title}`} />
				<CardContent className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-2">
						<div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-foreground">{set.title}</h3>{set.status === 'draft' && <Badge variant="warning">Nháp</Badge>}{set.enrolled && <Badge variant={set.mastered === set.words && set.words > 0 ? 'success' : 'accent'}>{set.label}</Badge>}</div>
						{set.description && <p className="text-sm text-muted">{set.description}</p>}
						<p className="text-xs text-muted">{set.words} từ{set.inMistakeBook > 0 ? ` · ${set.inMistakeBook} trong Sổ` : ''}</p>
						{set.enrolled && <ProgressBar value={set.mastered} max={Math.max(1, set.words)} />}
					</div>
					{set.status === 'published' && !set.enrolled && <div className="relative z-10"><EnrollButton setId={set.id} enrolled={false} /></div>}
					{set.enrolled && <span className="relative z-10 text-sm font-bold text-accent">Tiếp tục →</span>}
				</CardContent>
			</Card>
		</li>
	);
	return (
		<div className="mx-auto max-w-6xl space-y-7 px-4 py-7 sm:px-6 lg:px-8">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div><p className="label-caps">Hành trình từ vựng</p><h1 className="mt-1 text-3xl font-black text-foreground sm:text-4xl">Hôm nay</h1><p className="mt-2 text-sm text-muted">Mỗi từ được nhớ lâu là một bước tiến thật.</p></div>
				<Link href="/progress" className="text-sm font-bold text-accent">Xem nhân vật →</Link>
			</header>

			<section className="game-hero relative overflow-hidden rounded-2xl border p-5 sm:p-7">
				<AdventureLandscape />
				<div className="game-hero-stamps" aria-hidden="true"><AdventureIcon name="mountain" size={34} /><AdventureIcon name="spark" size={20} /><AdventureIcon name="flag" size={24} /></div>
				<div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] md:items-center">
					<div>
						<div className="flex items-center gap-3"><div className="game-avatar" aria-hidden="true"><AdventureIcon name="compass" size={32} /></div><div><p className="label-caps text-muted">Nhân vật của bạn</p><h2 className="text-2xl font-black text-foreground">{title}</h2></div></div>
						<p className="mt-5 text-sm font-semibold text-foreground-secondary">Cấp {progress.level} · {progress.totalXp} XP ghi nhớ</p>
						<div className="mt-2 flex items-center gap-3"><div className="game-progress-track"><div className="game-progress-fill" style={{ width: `${progress.xpProgress}%` }} /></div><span className="whitespace-nowrap text-xs font-black text-foreground-secondary">{progress.xpIntoLevel}/100 XP</span></div>
						<p className="mt-2 text-xs text-muted">Level = trí nhớ đã chứng minh. Danh hiệu = vốn từ bạn đang giữ.</p>
					</div>
					<div className="game-stat-box"><div className="flex items-center justify-between"><span className="text-sm font-extrabold text-foreground">Vốn từ đang giữ</span><AdventureIcon name="trophy" size={25} framed /></div><p className="mt-2 text-4xl font-black text-foreground">{mastered}</p><p className="mt-1 text-xs leading-relaxed text-muted">Tiến bộ đo bằng trí nhớ được kiểm tra, không phải thời gian mở app.</p></div>
				</div>
			</section>

			<div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
				<Card className="game-card game-card-amber"><CardContent className="space-y-4">
					<div className="flex items-center justify-between"><div><p className="label-caps text-amber-700">Bản đồ nhiệm vụ</p><h2 className="mt-1 text-xl font-black">Chọn một bước tiếp theo</h2></div><AdventureIcon name="map" size={28} framed /></div>
					<div className="grid gap-3 sm:grid-cols-2">
						<Link href="/mistakes" className="game-action"><AdventureIcon name="book" size={21} framed /><span className="min-w-0 flex-1"><strong>{mistakeCount > 0 ? `Ôn ${mistakeCount} từ trong Sổ` : 'Sổ từ sai đang trống'}</strong><small>{mistakeCount > 0 ? 'Gặp lại từ khó và sửa lỗ hổng' : 'Từ chưa đạt sẽ được lưu tại đây'}</small></span><span aria-hidden>→</span></Link>
						<Link href="/review" className="game-action"><AdventureIcon name="search" size={21} framed /><span className="min-w-0 flex-1"><strong>{reviewEligible > 0 ? `Kiểm tra ${reviewEligible} từ` : 'Tổng hợp từ đã học'}</strong><small>{reviewEligible > 0 ? 'Ôn tập giúp trí nhớ bền hơn' : 'Các từ đã gặp sẽ xuất hiện ở đây'}</small></span><span aria-hidden>→</span></Link>
					</div>
					{reviewEligible > 0 && <Link href="/review"><Button>Vào bài tổng hợp · {reviewEligible} từ</Button></Link>}
				</CardContent></Card>

				<Card className="game-card game-card-lilac"><CardContent>
					<div className="flex items-center justify-between"><div><p className="label-caps text-emerald-700">Nhịp hành trình</p><h2 className="mt-1 text-xl font-black">Tiến đều, nghỉ thoải mái</h2></div><AdventureIcon name="sprout" size={26} framed /></div>
					<div className="mt-5 grid grid-cols-7 gap-2">{weekDays.map((day, index) => { const done = studiedDays.has(days[index]); const future = days[index] > today; return <div key={day} className="text-center"><div className={`week-day-tile mx-auto flex h-9 w-9 items-center justify-center text-sm font-black ${done ? 'is-done' : future ? 'is-future' : 'is-pending'}`}>{done ? '✓' : '·'}</div><span className="mt-1 block text-[10px] font-bold text-muted">{day}</span></div>; })}</div>
					<p className="mt-4 text-xs leading-relaxed text-muted">Ngày học được ghi nhận từ bài kiểm tra hoặc phiên luyện đủ 5 phút. Không có chuỗi ngày bị mất.</p>
				</CardContent></Card>
			</div>

				<Card className="game-card game-card-rose"><CardContent className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><AdventureIcon name="target" size={25} framed /><div><p className="label-caps text-rose-700">Chặng kế tiếp</p><h2 className="mt-1 text-lg font-black">{progress.exposedToday > 0 ? `Ngày mai: kiểm tra ${progress.exposedToday} từ vừa luyện` : 'Không có bài tập bắt buộc ngày mai'}</h2><p className="mt-1 text-sm text-muted">Khoảng cách giúp phân biệt nhớ tạm với nhớ lâu.</p></div></div><Link href="/quests" className="whitespace-nowrap text-sm font-bold text-accent">Mở nhiệm vụ →</Link></CardContent></Card>
			<DailySummary />

			{learning.length > 0 && <section className="space-y-3"><div className="flex items-end justify-between"><div><p className="label-caps">Chặng đang đi</p><h2 className="text-xl font-black">Bộ từ đang học</h2></div><Link href="/sets" className="text-sm font-bold text-accent">Tất cả bộ từ →</Link></div><ul className="grid gap-3 lg:grid-cols-2">{learning.map(renderSet)}</ul></section>}
			{others.length > 0 && <section className="space-y-3"><h2 className="text-xl font-black">Khám phá bộ từ</h2><ul className="grid gap-3 lg:grid-cols-2">{others.map(renderSet)}</ul></section>}
			<p className="rest-note rounded-2xl px-4 py-3 text-center text-sm font-bold">Nghỉ ngơi không làm mất tiến bộ. Học tiếp khi bạn sẵn sàng. <span aria-hidden>✦</span></p>
		</div>
	);
}
