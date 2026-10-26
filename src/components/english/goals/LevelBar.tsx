import type { LevelInfo } from '@/lib/english/xp';

/** Level badge, title and a thin XP bar toward the next level. */
export default function LevelBar({ level, compact = false, label = true }: { level: LevelInfo; compact?: boolean; label?: boolean }) {
	const percent = Math.round((level.intoLevel / level.levelSize) * 100);
	return <div className="min-w-0">
		{label && <div className="mb-1.5 flex items-center gap-2">
			<span className="level-badge">Lv {level.level}</span>
			<span className={`truncate font-bold ${compact ? 'text-xs' : 'text-sm'}`}>{level.title}</span>
		</div>}
		<div className={`game-progress-track overflow-hidden ${compact ? 'h-2' : 'h-3'}`} role="progressbar" aria-label={`Kinh nghiệm cấp ${level.level}`} aria-valuemin={0} aria-valuemax={level.levelSize} aria-valuenow={level.intoLevel}>
			<div className="game-progress-fill h-full transition-all duration-700 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
		</div>
		{!compact && <p className="mt-1 text-xs text-muted"><span className="tabular-nums">{level.intoLevel}/{level.levelSize} XP</span> · còn {level.toNext} XP lên Lv {level.level + 1}</p>}
	</div>;
}
