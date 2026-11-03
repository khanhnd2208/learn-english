import Link from 'next/link';

const primary = 'today-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 font-bold text-accent-foreground';

/** Entry card for Ôn theo bộ, shown beside the daily review. */
export default function GuidedReviewCard({ hasSets }: { hasSets: boolean }) {
	return <section aria-label="Ôn theo bộ" className="mode-card game-card-lilac flex h-full flex-col">
		<h2 className="label-caps text-accent">Ôn theo bộ</h2>
		<p className="mt-1 text-sm text-foreground-secondary">Mỗi lượt 5 từ: xem thẻ, làm quiz, rồi làm lại câu sai. Không đổi lịch ôn luân phiên.</p>
		<div className="mt-auto pt-3.5"><Link href={hasSets ? '/review' : '/store'} className={primary}>{hasSets ? 'Chọn bộ để ôn' : 'Chọn bộ từ đầu tiên'} <span aria-hidden="true">→</span></Link></div>
	</section>;
}
