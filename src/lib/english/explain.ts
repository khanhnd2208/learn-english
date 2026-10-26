import type { SenseBundle } from '@/lib/english/senseBundle';

export function explainMiss(sense: SenseBundle): string {
	const error = sense.sense.commonErrors.find((item) => item.whyVi.trim());
	if (error) return `${error.right} — ${error.whyVi}`;
	const contrast = sense.relations.find((relation) => relation.contrast.length === 2);
	if (contrast) {
		const sides = contrast.contrast.map((side) => `${side.lemma}: ${side.en} (${side.vi})`).join(' · ');
		return contrast.noteVi ? `${contrast.noteVi} ${sides}` : sides;
	}
	return sense.sense.pitfallVi;
}
