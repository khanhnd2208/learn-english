import InfoHint from '@/components/ui/InfoHint';
import { HINTS } from '@/lib/english/hintCopy';
import { STAGE_META } from '@/lib/english/stageMeta';
import type { countStages } from '@/lib/english/schedule';

type Stages = ReturnType<typeof countStages>;
const parts = [
	['new', 'new'], ['learning', 'learning'], ['remembering', 'remembering'], ['longTerm', 'long_term'],
] as const;
/** The bar fills from the left with the strongest stage, so progress reads left to right. */
const barParts = [...parts].reverse();

export default function StageBar({ stages, legend = false }: { stages: Stages; legend?: boolean | 'compact' }) {
	const total = Object.values(stages).reduce((sum, count) => sum + count, 0);
	return <div>
		<div className="flex h-3 overflow-hidden rounded-full bg-surface-container" role="img" aria-label={parts.map(([key, stage]) => `${STAGE_META[stage].label}: ${stages[key]}`).join(', ')}>
			{barParts.map(([key, stage]) => stages[key] > 0 && <span key={key} className={STAGE_META[stage].barClassName} style={{ width: `${total ? (stages[key] / total) * 100 : 0}%` }} />)}
		</div>
		{legend && <div className={`mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 ${legend === 'compact' ? 'gap-1.5' : ''}`}>{parts.map(([key, stage]) => <div key={key} title={`${STAGE_META[stage].label}: ${STAGE_META[stage].hint}`} className={`flex items-center gap-2 rounded-card ${legend === 'compact' ? 'bg-surface-container px-2 py-1.5' : ''}`}><span className={`size-2.5 shrink-0 rounded-full ${STAGE_META[stage].barClassName}`} /><span className="min-w-0 truncate"><strong className="mr-1 text-sm tabular-nums">{stages[key]}</strong>{STAGE_META[stage].label}</span></div>)}</div>}
		{legend && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">Mức nhớ = khoảng cách tới lần ôn sau <InfoHint title={HINTS.stages.title}>{HINTS.stages.body}</InfoHint></p>}
	</div>;
}
