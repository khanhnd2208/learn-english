export interface PublishIssue { path: string; code: string; message: string; blocksGrade?: boolean }
export interface PublishOutcome { publishedSenses: number; totalSenses: number; issues: PublishIssue[] }

/** Words that could not go live, as "lemma: reason" lines (one per word). */
export function blockedWordReasons(issues: PublishIssue[], limit = 3): string[] {
	const byWord = new Map<string, string>();
	for (const issue of issues) {
		if (!issue.blocksGrade || issue.path.includes('quizExamples')) continue;
		const word = issue.path.split(':')[0] ?? issue.path;
		if (!byWord.has(word)) byWord.set(word, `${word}: ${issue.message}`);
	}
	return [...byWord.values()].slice(0, limit);
}

/** Publishes a set; throws with the reasons when no word could be published (the set stays a draft). */
export async function publishEnglishSetRequest(setId: string): Promise<PublishOutcome> {
	const response = await fetch('/api/admin/publish', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ setId }),
	});
	const body = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; data?: Partial<PublishOutcome> };
	if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không xuất bản được');
	const outcome = { publishedSenses: body.data?.publishedSenses ?? 0, totalSenses: body.data?.totalSenses ?? 0, issues: body.data?.issues ?? [] };
	if (outcome.publishedSenses === 0) {
		const reasons = blockedWordReasons(outcome.issues);
		throw new Error(`Chưa xuất bản được từ nào nên bộ vẫn là bản nháp.${reasons.length ? ` ${reasons.join(' · ')}` : ''}`);
	}
	return outcome;
}

export function publishSummary({ publishedSenses, totalSenses }: PublishOutcome): string {
	const held = totalSenses - publishedSenses;
	return `Đã xuất bản ${publishedSenses}/${totalSenses} từ.${held > 0 ? ` ${held} từ thiếu trường bắt buộc vẫn là nháp.` : ''}`;
}
