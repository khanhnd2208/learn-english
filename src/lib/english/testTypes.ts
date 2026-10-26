export interface EnglishTestItemView {
	id: string;
	position: number;
	activityKey: string;
	prompt: Record<string, unknown>;
	answer?: string | null;
}

export interface EnglishTestWordResult {
	senseId: string;
	lemma: string;
	meaningVi: string;
	passed: boolean;
	counted: boolean;
	items: Array<{
		id: string;
		role: string;
		activityKey: string;
		prompt: unknown;
		answer: string | null;
		correct: boolean | null;
		answerKey: string;
	}>;
}

export interface FinishedEnglishTest {
	attemptId: string;
	status: string;
	passedCount: number;
	wordCount: number;
	words: EnglishTestWordResult[];
}

export interface EnglishTestStart {
	attemptId: string;
	items: EnglishTestItemView[];
	resumed: boolean;
	wordCount: number;
	phase?: 'recall' | 'recognize';
}
