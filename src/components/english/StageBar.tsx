import { STAGE_META } from '@/lib/english/stageMeta';
import type { countStages } from '@/lib/english/schedule';

type Stages = ReturnType<typeof countStages>;
const parts = [
	['new', 'new'], ['learning', 'learning'], ['remembering', 'remembering'], ['longTerm', 'long_term'],
] as const;

export default function StageBar({ stages, legend = false }: { stages: Stages; legend?: boolean }) {
	const total = Object.values(stages).reduce((sum, count) => sum + count, 0);
	return <div>
		<div className="flex h-3 overflow-hidden rounded-full bg-surface-container" role="img" aria-label={parts.map(([key, stage]) => `${STAGE_META[stage].label}: ${stages[key]}`).join(', ')}>
			{parts.map(([key, stage]) => stages[key] > 0 && <span key={key} className={STAGE_META[stage].barClassName} style={{ width: `${total ? (stages[key] / total) * 100 : 0}%` }} />)}
		</div>
		{legend && <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{parts.map(([key, stage]) => <div key={key} className="flex items-center gap-2"><span className={`size-2.5 shrink-0 rounded-full ${STAGE_META[stage].barClassName}`} /><span>{STAGE_META[stage].label} <strong>{stages[key]}</strong></span></div>)}</div>}
	</div>;
}
