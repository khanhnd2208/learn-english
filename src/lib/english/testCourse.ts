export interface CoursePaper { id: string; bestPercent: number | null }

/** Progress through a course whose papers are already in course order. */
export function courseProgress(papers: CoursePaper[], passPercent: number): { passed: number; total: number; nextId: string | null } {
  const isPassed = (paper: CoursePaper) => paper.bestPercent !== null && paper.bestPercent >= passPercent;
  return { passed: papers.filter(isPassed).length, total: papers.length, nextId: papers.find((paper) => !isPassed(paper))?.id ?? null };
}
